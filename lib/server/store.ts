import { readFileSync, readdirSync, chmodSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import {lockLocalData} from './local-storage';
import type { Evidence, MatchingCard, Opportunity } from '@/lib/contracts';
import { profiles } from '@/fixtures/profiles';

// Postgres when DATABASE_URL is set (Supabase in production, see db/README.md).
// Local development uses disk-backed PGlite; shared/serverless deployments require Postgres.

// ponytail: one event per deployment; add an events table if you ever run two rooms at once.
export const EVENT_CODE = (process.env.EVENT_CODE || 'SUPERSET').trim().toUpperCase();
export const EVENT_ID = 'event-demo';
export const SYNTHETIC_PREFIX = 'Synthetic · ';

export type Participant = { id: string; eventId: string };
export type Identity = { displayName: string; contact: string };
export type Match = {
  id: string; eventId: string; a: string; b: string; score: number;
  opportunity: Opportunity; evidence: Evidence[];
  aCard?:MatchingCard; bCard?:MatchingCard;
  introConsents?: Record<string,{identity:Identity;briefVersion:number;approvedAt:string}>;
  approvals: Set<string>; declinedBy: string | null;
  // participantId -> identity that person released for THIS pair, frozen at approval. Internal only.
  snapshots: Record<string, Identity | null>;
};
export type Pitch = {
  id: string; matchId: string; version: number; markdown: string;
  identityFields: Record<string, string[]>;         // participantId -> fields that person proposes to export
  approvedVersion: Record<string, number | null>;   // participantId -> version they approved
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
export type Q = (text: string, params?: unknown[]) => Promise<Row[]>;
export type Db = { q: Q; exec: (sql: string) => Promise<unknown>; end: () => Promise<void>; transaction: <T>(fn: (query: Q) => Promise<T>) => Promise<T> };

export function connect(url: string): Db {
  const u = new URL(url);
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  // Drop sslmode/sslrootcert from the copy-pasted URL and verify TLS explicitly instead.
  u.search = '';
  // Supabase signs with its own root CA: DATABASE_CA_CERT holds that PEM (contents, or a file path locally).
  const ca = process.env.DATABASE_CA_CERT?.trim();
  const ssl = local ? false : { rejectUnauthorized: true, ...(ca && { ca: ca.includes('BEGIN CERTIFICATE') ? ca.replace(/\\n/g, '\n') : readFileSync(ca, 'utf8') }) };
  const pool = new pg.Pool({ connectionString: u.toString(), ssl, max: 5 });
  return {
    q: async (t, p) => (await pool.query(t, p)).rows, exec: (sql) => pool.query(sql), end: () => pool.end(),
    transaction: async fn => {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await fn(async (t, p) => (await client.query(t, p)).rows);
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  };
}

export async function openLocalDatabase(directory?:string): Promise<Db> {
  const release=directory?lockLocalData(directory):()=>{};
  const { PGlite } = await import('@electric-sql/pglite');
  const lite = new PGlite(directory);
  const db: Db = {
    q: async (t, p) => (await lite.query<Row>(t, p)).rows, exec: (sql) => lite.exec(sql), end: async () => {await lite.close();release();},
    transaction: fn => lite.transaction(tx => fn(async (t, p) => (await tx.query<Row>(t, p)).rows)),
  };
  try{await migrate(db);await seed(db);if(directory)chmodSync(directory,0o700);return db;}catch(error){await lite.close().catch(()=>{});release();throw error;}
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

// Tests deliberately remain isolated in memory. Normal dev survives hot reload AND restarts.
const g = globalThis as unknown as { __wyjDb?: Promise<Db>;__wyjDurableDb?:Promise<Db> };
function getDb(){
 if(process.env.DATABASE_URL)return g.__wyjDb??=Promise.resolve(connect(process.env.DATABASE_URL));
 if(process.env.NODE_TEST_CONTEXT||process.env.WYJ_DB_MEMORY==='1')return g.__wyjDb??=openLocalDatabase();
 if(process.env.NODE_ENV==='production')throw new Error('DATABASE_URL is required in production; refusing ephemeral profile storage.');
 return g.__wyjDurableDb??=(async()=>{
  const db=await openLocalDatabase(path.resolve(process.env.WYJ_DATA_DIR||'.wyj-local/data'));
  // Preserve a running pre-upgrade dev database if it still exists in this process.
  if(g.__wyjDb){const old=await g.__wyjDb;await db.transaction(async query=>{
   for(const table of ['participants','identities','cards','ideas','participant_plans','matches','pitches','trials']){
    const columns=await old.q('select column_name,data_type from information_schema.columns where table_name=$1 order by ordinal_position',[table]);
    for(const row of await old.q(`select * from ${table}`)){
     const names=columns.map(c=>c.column_name);const values=columns.map(c=>c.data_type==='jsonb'&&row[c.column_name]!==null?JSON.stringify(row[c.column_name]):row[c.column_name]);
     await query(`insert into ${table} (${names.join(',')}) values (${names.map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing`,values);
    }
   }
  });}
  return db;
 })();
}
export const q: Q = async (text, params) => (await getDb()).q(text, params);
export const transaction = async <T>(fn: (query: Q) => Promise<T>): Promise<T> => (await getDb()).transaction(fn);

export const cardRow = (r: Row): MatchingCard => ({
  id: r.participant_id, eventId: r.event_id, alias: r.alias, offers: r.offers, seeks: r.seeks,
  interests: r.interests, availability: r.availability, approvedBlurb: r.approved_blurb, version: r.version,
  ...(r.idea_id ? { ideaId: r.idea_id } : {}), ...(r.preferences ? { preferences: r.preferences } : {}),
});

export const matchRow = (r: Row): Match => ({
  id: r.id, eventId: r.event_id, a: r.a, b: r.b, score: r.score, opportunity: r.opportunity, evidence: r.evidence,
  ...(r.a_card ? { aCard: r.a_card } : {}), ...(r.b_card ? { bCard: r.b_card } : {}),
  approvals: new Set([r.a_approved ? r.a : null, r.b_approved ? r.b : null].filter((x): x is string => !!x)),
  declinedBy: r.declined_by,
  snapshots: { [r.a]: r.a_identity ?? null, [r.b]: r.b_identity ?? null },
  introConsents: Object.fromEntries(['a', 'b'].flatMap(side =>
    r[side + '_approved'] && r[side + '_identity'] && r[side + '_approved_at'] && r[side + '_card_version'] != null
      ? [[r[side], { identity: r[side + '_identity'], approvedAt: new Date(r[side + '_approved_at']).toISOString(), briefVersion: r[side + '_card_version'] }]] : [])),
});

export const pitchRow = (r: Row, m: Match): Pitch => ({
  id: r.id, matchId: r.match_id, version: r.version, markdown: r.markdown,
  identityFields: { [m.a]: r.a_fields, [m.b]: r.b_fields },
  approvedVersion: { [m.a]: r.a_approved_version, [m.b]: r.b_approved_version },
});
