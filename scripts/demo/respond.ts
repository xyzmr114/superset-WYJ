// Lets demo founders answer: when a real person requests an intro, the demo founder approves it after a
// short pause (so judges see "waiting" first), revealing their demo name/contact. Never initiates anything.
// Usage: npx tsx scripts/demo/respond.ts [--once]     DELAY_MS (default 4000) sets the pause.
import { pathToFileURL } from 'node:url';
import { api, loadSessions, type Session } from './client';

const DELAY = Number(process.env.DELAY_MS ?? 4000);
const seenAt = new Map<string, number>(); // match id -> first time we saw the request

async function tick(s: Session, immediate: boolean) {
  const r = await api<{ matches: any[] }>('GET', '/api/matches', undefined, s.cookie);
  if (r.status !== 200) return;
  for (const m of r.data.matches) {
    if (m.status !== 'pending' || m.myIntroApproval) continue; // only answer requests from the other person
    const first = seenAt.get(m.id) ?? Date.now();
    seenAt.set(m.id, first);
    if (!immediate && Date.now() - first < DELAY) continue;
    const a = await api('POST', `/api/matches/${encodeURIComponent(m.id)}/consent`,
      { decision: 'approve', identity: { displayName: s.displayName, contact: s.contact } }, s.cookie);
    console.log(`${new Date().toLocaleTimeString()}  ${s.alias} approved an intro with ${m.candidate?.alias ?? 'someone'} -> ${a.status === 200 ? a.data?.status : `error ${a.status}`}`);
  }
}

/** One pass over every demo founder. Re-reads the session file so newly created founders answer too. */
export async function answerRequests(immediate = false) {
  for (const s of loadSessions()) await tick(s, immediate).catch((e) => console.log(`${s.alias}: ${e.message}`));
}

async function main() {
  const once = process.argv.includes('--once');
  if (!loadSessions().length) throw new Error('No demo founders found. Run scripts/demo/seed.ts first.');
  console.log(`Answering intro requests for demo founders${once ? ' (one pass)' : ' (Ctrl+C to stop)'}`);
  do {
    await answerRequests(once);
    if (!once) await new Promise((r) => setTimeout(r, 1500));
  } while (!once);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
