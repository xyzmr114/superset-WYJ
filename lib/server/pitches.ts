import {mutuallyApproved} from './intro-consent';
import type { PitchView } from '@/lib/contracts';
import { buildPitchMarkdown } from '@/lib/generation';
import { db, type Match, type Pitch } from './store';
import { HttpError, notFound } from './http';

export type Ctx = { params: Promise<{ id: string }> };

export const isRevealed=mutuallyApproved;
export const otherOf = (m: Match, me: string) => (m.a === me ? m.b : m.a);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);

/** Match I'm in, or 404 (never reveal existence to outsiders). */
export function myMatch(id: string, me: string): Match {
  const m = db.matches.get(id);
  if (!m || (m.a !== me && m.b !== me)) throw notFound();
  return m;
}

export function myPitch(id: string, me: string): { pitch: Pitch; match: Match } {
  const pitch = db.pitches.get(id);
  if (!pitch) throw notFound();
  return { pitch, match: myMatch(pitch.matchId, me) };
}

export function toView(p: Pitch, m: Match, me: string): PitchView {
  const them = otherOf(m, me);
  const bothApproved = p.approvedVersion[me] === p.version && p.approvedVersion[them] === p.version;
  return {
    id: p.id, matchId: p.matchId, version: p.version, markdown: p.markdown,
    proposedIdentityFields: { me: p.identityFields[me] ?? [], them: p.identityFields[them] ?? [] },
    myApproval: p.approvedVersion[me] === p.version, bothApproved, exportable: bothApproved,
  };
}

/** Draft built only from matching cards (aliases), opportunity and evidence. No names or contacts. */
export function draftMarkdown(m: Match): string {
  // Cards exist for both sides of any match and are frozen once matched.
  return buildPitchMarkdown({ founders: [m.aCard??db.cards.get(m.a)!, m.bCard??db.cards.get(m.b)!] }, m.opportunity, m.evidence);
}
