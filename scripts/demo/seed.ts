// Creates the demo founders through the public API (session -> identity -> published idea).
// Usage: npx tsx scripts/demo/seed.ts        Idempotent: founders already in .wyj-demo/sessions.json are skipped.
process.loadEnvFile('.env.local');
import {restoreFixedFounder} from './fixed-founders';
import { DEMO_FOUNDERS } from './founders';
import { BASE, EVENT_CODE, api, loadSessions, saveSessions } from './client';

async function main() {
  const sessions = loadSessions();
  console.log(`Seeding ${DEMO_FOUNDERS.length} demo founders into ${BASE} (event ${EVENT_CODE})`);
  for (const p of DEMO_FOUNDERS) {
    const restored=await restoreFixedFounder(p);
    if(restored){console.log(`  = ${p.alias.padEnd(7)} restored existing demo founder; duplicates unpublished`);continue;}
    const existing = sessions.find((s) => s.alias === p.alias);
    if (existing && (await api('GET', '/api/me/ideas', undefined, existing.cookie)).status === 200) {
      console.log(`  = ${p.alias.padEnd(7)} already seeded`);
      continue;
    }
    const s = await api('POST', '/api/session', { eventCode: EVENT_CODE });
    if (s.status !== 200 || !s.cookie) throw new Error(`session failed for ${p.alias}: ${s.status} ${JSON.stringify(s.data)}`);
    const id = await api('PUT', '/api/me/identity', { displayName: p.displayName, contact: p.contact }, s.cookie);
    if (id.status !== 200) throw new Error(`identity failed for ${p.alias}: ${id.status} ${JSON.stringify(id.data)}`);
    const { displayName, contact, ...card } = p;
    const idea = await api('POST', '/api/me/ideas', { ...card, publishConsent: true }, s.cookie);
    if (idea.status !== 200) throw new Error(`idea failed for ${p.alias}: ${idea.status} ${JSON.stringify(idea.data)}`);
    const rest = loadSessions().filter((x) => x.alias !== p.alias);
    sessions.length = 0;
    sessions.push(...rest, { alias: p.alias, cookie: s.cookie, participantId: s.data.participantId, displayName, contact });
    saveSessions(sessions);
    console.log(`  ✓ ${p.alias.padEnd(7)} offers ${p.offers.join(', ').padEnd(18)} seeks ${p.seeks.join(', ').padEnd(18)} ${p.interests.join(', ')}`);
  }
  console.log('Done. Run scripts/demo/respond.ts during the demo so these founders answer intro requests.');
}

main().catch((e) => { console.error(`Seed failed: ${e.message}`); process.exitCode = 1; });
