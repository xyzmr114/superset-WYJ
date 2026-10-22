import type { Evidence, MatchingCard, Opportunity } from '@/lib/contracts';
import { profiles } from '@/fixtures/profiles';

// ponytail: in-memory state for a single-process demo (`pnpm dev`/`pnpm start` on one machine + a tunnel).
// Resets on restart and breaks on multi-instance hosting (e.g. Vercel). Swap for Postgres via db/ if that matters.
// Every mutation is synchronous, so Node's single thread makes each one atomic (our "transaction").

export type Participant = { id: string; eventId: string; tokenHash: string | null };
export type Identity = { displayName: string; contact: string };
export type Match = {
  id: string; eventId: string; a: string; b: string; score: number;
  opportunity: Opportunity; evidence: Evidence[];
  introConsents?: Record<string,{identity:Identity;briefVersion:number;approvedAt:string}>;
  approvals: Set<string>; declinedBy: string | null;
};
export type Pitch = {
  id: string; matchId: string; version: number; markdown: string;
  identityFields: Record<string, string[]>;   // participantId -> fields that person proposes to export
  approvedVersion: Record<string, number>;    // participantId -> version they approved
};

type Store = {
  events: Map<string, string>;                // code -> eventId
  participants: Map<string, Participant>;
  sessions: Map<string, string>;              // tokenHash -> participantId
  identities: Map<string, Identity>;          // kept apart from cards; read only on mutual reveal
  cards: Map<string, MatchingCard>;           // participantId -> published card
  matches: Map<string, Match>;
  pitches: Map<string, Pitch>;                // pitchId -> pitch
};

export const EVENT_CODE = process.env.EVENT_CODE ?? 'SUPERSET';
export const EVENT_ID = 'event-demo';
export const SYNTHETIC_PREFIX = 'Synthetic · ';

function create(): Store {
  const s: Store = {
    events: new Map([[EVENT_CODE, EVENT_ID]]),
    participants: new Map(), sessions: new Map(), identities: new Map(),
    cards: new Map(), matches: new Map(), pitches: new Map(),
  };
  // Synthetic participants so a lone demo still gets candidates. No session, so they never approve anything.
  for (const p of profiles) {
    s.participants.set(p.id, { id: p.id, eventId: EVENT_ID, tokenHash: null });
    s.cards.set(p.id, { ...p, eventId: EVENT_ID, alias: SYNTHETIC_PREFIX + p.alias });
  }
  return s;
}

// Survive Next dev hot reloads.
const g = globalThis as unknown as { __wyjStore?: Store };
export const db: Store = (g.__wyjStore ??= create());

export const isSynthetic = (participantId: string) => db.participants.get(participantId)?.tokenHash === null;
export const isFrozen = (participantId: string) =>
  [...db.matches.values()].some((m) => m.a === participantId || m.b === participantId);
