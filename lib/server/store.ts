import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import type { Evidence, MatchingCard, Opportunity } from '@/lib/contracts';
import { profiles } from '@/fixtures/profiles';

// Postgres when DATABASE_URL is set (Supabase in production, see db/README.md).
// ponytail: without DATABASE_URL we boot an in-process PGlite (real Postgres in WASM) so local dev
// and the synthetic demo still need zero setup. It resets on restart, same as the old Map store.

// ponytail: one event per deployment; add an events table if you ever run two rooms at once.
export const EVENT_CODE = (process.env.EVENT_CODE || 'SUPERSET').trim().toUpperCase();
export const EVENT_ID = 'event-demo';
export const SYNTHETIC_PREFIX = 'Synthetic · ';

export type Participant = { id: string; eventId: string };
export type Identity = { displayName: string; contact: string };
export type Match = {
  id: string; eventId: string; a: string; b: string; score: number;
  opportunity: Opportunity; evidence: Evidence[];
  approvals: Set<string>; declinedBy: string | null;
};
export type Pitch = {
  id: string; matchId: string; version: number; markdown: string;
  identityFields: Record<string, string[]>;         // participantId -> fields that person proposes to export
  approvedVersion: Record<string, number | null>;   // participantId -> version they approved
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
export type Q = (text: string, params?: unknown[]) => Promise<Row[]>;
export type Db = { q: Q; exec: (sql: string) => Promise<unknown>; end: () => Promise<void> };

export function connect(url: string): Db {
  const u = new URL(url);
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  // Drop sslmode/sslrootcert from the copy-pasted URL and verify TLS explicitly instead.
  u.search = '';
  // Supabase signs with its own root CA: DATABASE_CA_CERT holds that PEM (contents, or a file path locally).
  const ca = process.env.DATABASE_CA_CERT?.trim();
  const ssl = local ? false : { rejectUnauthorized: true, ...(ca && { ca: ca.includes('BEGIN CERTIFICATE') ? ca.replace(/\\n/g, '\n') : readFileSync(ca, 'utf8') }) };
  const pool = new pg.Pool({ connectionString: u.toString(), ssl, max: 5 });
  return { q: async (t, p) => (await pool.query(t, p)).rows, exec: (sql) => pool.query(sql), end: () => pool.end() };
}

async function memory(): Promise<Db> {
  console.warn('[wyj] DATABASE_URL not set: using in-memory PGlite. Data resets on restart.');
  const { PGlite } = await import('@electric-sql/pglite');
  const lite = new PGlite();
  const db: Db = { q: async (t, p) => (await lite.query<Row>(t, p)).rows, exec: (sql) => lite.exec(sql), end: () => lite.close() };
  await migrate(db);
  await seed(db);
  return db;
}

/** Applies db/migrations/*.sql in name order, each once, each in its own transaction. */
export async function migrate(db: Db, log: (name: string) => void = () => {}) {
  await db.exec('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const done = new Set((await db.q('select name from schema_migrations')).map((r) => r.name));
  const dir = path.join(process.cwd(), 'db', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    await db.exec(`begin;\n${readFileSync(path.join(dir, file), 'utf8')}\ninsert into schema_migrations (name) values ('${file.replace(/'/g, "''")}');\ncommit;`);
    log(file);
  }
}

/** Synthetic participants so a lone demo still gets candidates. No token, so they never approve anything. Idempotent. */
export async function seed(db: Db) {
  for (const p of profiles) {
    await db.q('insert into participants (id, event_id) values ($1, $2) on conflict do nothing', [p.id, EVENT_ID]);
    await db.q(
      `insert into cards (participant_id, event_id, alias, offers, seeks, interests, availability, approved_blurb)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict do nothing`,
      [p.id, EVENT_ID, SYNTHETIC_PREFIX + p.alias, p.offers, p.seeks, p.interests, p.availability, p.approvedBlurb],
    );
  }
}

// Survive Next dev hot reloads.
const g = globalThis as unknown as { __wyjDb?: Promise<Db> };
const getDb = () => (g.__wyjDb ??= process.env.DATABASE_URL ? Promise.resolve(connect(process.env.DATABASE_URL)) : memory());
export const q: Q = async (text, params) => (await getDb()).q(text, params);

export const cardRow = (r: Row): MatchingCard => ({
  id: r.participant_id, eventId: r.event_id, alias: r.alias, offers: r.offers, seeks: r.seeks,
  interests: r.interests, availability: r.availability, approvedBlurb: r.approved_blurb, version: r.version,
});

export const matchRow = (r: Row): Match => ({
  id: r.id, eventId: r.event_id, a: r.a, b: r.b, score: r.score, opportunity: r.opportunity, evidence: r.evidence,
  approvals: new Set([r.a_approved ? r.a : null, r.b_approved ? r.b : null].filter((x): x is string => !!x)),
  declinedBy: r.declined_by,
});

export const pitchRow = (r: Row, m: Match): Pitch => ({
  id: r.id, matchId: r.match_id, version: r.version, markdown: r.markdown,
  identityFields: { [m.a]: r.a_fields, [m.b]: r.b_fields },
  approvedVersion: { [m.a]: r.a_approved_version, [m.b]: r.b_approved_version },
});
