// Live demo helper: when a real person publishes an idea, create one ADJACENT demo founder for it within
// ~5 seconds (same problem area, complementary skills, a different angle on the idea), then answer their
// intro requests. One terminal runs the whole demo.
//
//   npx tsx scripts/demo/adjacent.ts [--all]      --all also covers ideas published before the script started
//
// Privacy: at startup DeepSeek invents one fictional founder per (topic, skill) pair, so at demo time no
// user data reaches it at all. Only an uncached combination triggers a live call, and that call carries ONLY
// controlled tags (e.g. skills ["engineering"], topics ["travel"]) and availability: never the blurb, alias,
// name, contact or any free text. No DEEPSEEK_API_KEY, a slow answer (> 3.5 s) or an invalid one falls back
// to a built-in profile, so the demo never stalls.
// Demo founders are fictional: names end in "(demo)", contacts use example.com.
process.loadEnvFile('.env.local');
import { z } from 'zod';
import { INTERESTS, SKILLS } from '../../lib/contracts';
import { mapTags } from '../../lib/matching';
import { tagSet } from '../../lib/matching/tags';
import { connect } from '../../lib/server/store';
import { EVENT_CODE, api, loadSessions, saveSessions } from './client';

const KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.PREMIUM_DEEPSEEK_MODEL || 'deepseek-flash';
const BUDGET_MS = 3500;
const skillSet = new Set<string>(SKILLS), topicSet = new Set<string>(INTERESTS);

type Tags = { offers: string[]; seeks: string[]; interests: string[]; availability: 'exploring' | 'weekends' | 'full_time' };
type Founder = Tags & { first: string; last: string; blurb: string; source: 'DeepSeek' | 'template' };

/** Only controlled tags survive; custom free-text tags never leave this machine. */
const controlled = (card: any): Tags => ({
  offers: tagSet(mapTags(card.offers ?? [], 'skill')).filter((t) => skillSet.has(t)),
  seeks: tagSet(mapTags(card.seeks ?? [], 'skill')).filter((t) => skillSet.has(t)),
  interests: tagSet(mapTags(card.interests ?? [], 'interest')).filter((t) => topicSet.has(t)),
  availability: card.availability ?? 'weekends',
});

const Reply = z.object({
  firstName: z.string().regex(/^[A-Za-z]{2,14}$/), lastName: z.string().regex(/^[A-Za-z]{2,16}$/),
  offers: z.array(z.enum(SKILLS)).min(1).max(3), seeks: z.array(z.enum(SKILLS)).min(1).max(3),
  interests: z.array(z.enum(INTERESTS)).min(1).max(3), blurb: z.string().min(20).max(180),
});

const SYSTEM = `You invent ONE fictional co-founder for a hackathon demo. Reply with a single JSON object only:
{"firstName","lastName","offers","seeks","interests","blurb"}.
Rules: offers and seeks use only ${SKILLS.join(', ')}. interests use only ${INTERESTS.join(', ')}.
offers must include at least one skill the person SEEKS; seeks must include at least one skill the person OFFERS;
interests must share at least one topic with theirs. blurb: first person, under 160 characters, a different angle
on the same problem area, no real company or person names, no claims of revenue or customers.`;

async function fromDeepSeek(t: Tags, budget = BUDGET_MS): Promise<Founder | null> {
  if (!KEY) return null;
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(budget),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL, stream: false, max_tokens: 250, thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(t) }],
      }),
    });
    if (!res.ok) { console.log(`  DeepSeek HTTP ${res.status}; using template`); return null; }
    const text = (await res.json())?.choices?.[0]?.message?.content;
    const r = Reply.safeParse(JSON.parse(text));
    if (!r.success) { console.log('  DeepSeek reply failed validation; using template'); return null; }
    return { first: r.data.firstName, last: r.data.lastName, offers: r.data.offers, seeks: r.data.seeks,
      interests: r.data.interests, availability: t.availability, blurb: r.data.blurb, source: 'DeepSeek' };
  } catch (e: any) {
    console.log(`  DeepSeek ${e?.name === 'TimeoutError' ? `slower than ${budget} ms` : 'unreachable'}; using template`);
    return null;
  }
}

const ANGLE: Record<string, string> = {
  travel: 'I want to rebuild trip planning around what travellers actually decide, not search results.',
  'ai-agents': 'I keep seeing teams struggle to trust what their AI agents did. I want to fix that.',
  payments: 'Small businesses lose hours chasing failed payments. I want to automate that follow-up.',
  healthcare: 'Clinics drown in handoff paperwork. I want to give nurses that time back.',
  climate: 'Buildings waste energy nobody measures. I want to make that visible and fixable.',
  'developer-tools': 'Developers lose days to flaky builds. I want a tool that explains why they fail.',
};
// (topic|skill the person needs) -> a DeepSeek founder invented at startup from those two words alone.
const pregenerated = new Map<string, Founder>();
async function pregenerate() {
  if (!KEY) return;
  const combos = INTERESTS.flatMap((topic) => SKILLS.map((need) => ({ topic, need })));
  let i = 0;
  const worker = async () => {
    for (let c = combos[i++]; c; c = combos[i++]) {
      const f = await fromDeepSeek({ offers: [], seeks: [c.need], interests: [c.topic], availability: 'weekends' }, 12000);
      if (f) pregenerated.set(`${c.topic}|${c.need}`, f);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`Pre-generated ${pregenerated.size}/${combos.length} founders with DeepSeek (no user data involved).`);
}
function cached(t: Tags): Founder | null {
  for (const topic of t.interests) for (const need of t.seeks) {
    const f = pregenerated.get(`${topic}|${need}`);
    if (f) return { ...f, availability: t.availability };
  }
  return null;
}

const NAMES = [['Maya', 'Ortiz'], ['Leo', 'Brandt'], ['Zara', 'Ahmed'], ['Theo', 'Laurent'], ['Ines', 'Moreau'], ['Owen', 'Kato']];

function template(t: Tags, n: number): Founder {
  const topic = t.interests[0] ?? 'developer-tools';
  const taken = new Set(loadSessions().map((s) => s.alias));
  const [first, last] = NAMES.find(([f]) => !taken.has(f)) ?? NAMES[n % NAMES.length];
  return { first, last, offers: [...t.seeks.slice(0, 2)], seeks: [...t.offers.slice(0, 1)], interests: [topic],
    availability: t.availability, blurb: ANGLE[topic] ?? ANGLE['developer-tools'], source: 'template' };
}

/** Guarantees the matcher pairs them: shared topic + each offers something the other seeks. */
function makeAdjacent(f: Founder, t: Tags): Founder {
  const add = (xs: string[], x?: string) => (x && !xs.includes(x) ? [x, ...xs] : xs);
  const offers = t.seeks.some((s) => f.offers.includes(s)) ? f.offers : add(f.offers, t.seeks[0] ?? 'product');
  const seeks = t.offers.some((s) => f.seeks.includes(s)) ? f.seeks : add(f.seeks, t.offers[0] ?? 'engineering');
  const interests = t.interests.some((s) => f.interests.includes(s)) ? f.interests : add(f.interests, t.interests[0]);
  return { ...f, offers: offers.slice(0, 3), seeks: seeks.slice(0, 3), interests: interests.slice(0, 3) };
}

const newSession = async () => {
  const s = await api('POST', '/api/session', { eventCode: EVENT_CODE });
  if (s.status !== 200 || !s.cookie) throw new Error(`session failed (${s.status})`);
  return { cookie: s.cookie, participantId: s.data.participantId as string };
};

async function createFounder(f: Founder, session: Promise<{ cookie: string; participantId: string }>, ms: Record<string, number>) {
  const taken = new Set(loadSessions().map((s) => s.alias));
  let alias = f.first;
  for (let i = 2; taken.has(alias); i++) alias = `${f.first}${i}`;
  const displayName = `${f.first} ${f.last} (demo)`, contact = `${f.first}.${f.last}@example.com`.toLowerCase();
  const { cookie, participantId } = await session;
  let t = Date.now();
  const [, idea] = await Promise.all([
    api('PUT', '/api/me/identity', { displayName, contact }, cookie),
    api('POST', '/api/me/ideas', { alias, offers: f.offers, seeks: f.seeks, interests: f.interests,
      availability: f.availability, approvedBlurb: f.blurb, publishConsent: true }, cookie),
  ]);
  if (idea.status !== 200) throw new Error(`publish failed (${idea.status}) ${JSON.stringify(idea.data)}`);
  ms.publish = Date.now() - t;
  saveSessions([...loadSessions(), { alias, cookie, participantId, displayName, contact }]);
  // Matching from the demo founder's side creates the pair for both; the person's screen polls every 3 s.
  t = Date.now();
  await api('POST', '/api/matches/generate', {}, cookie);
  ms.match = Date.now() - t;
  return { alias };
}

async function main() {
  const all = process.argv.includes('--all');
  const db = connect(process.env.DATABASE_URL!);
  const since = all ? new Date(0) : new Date();
  const handled = new Set<string>();
  let made = 0;
  if (KEY) { console.log(`Pre-generating founders with DeepSeek (${MODEL})…`); await pregenerate(); }
  console.log(`Watching for new ideas${all ? ' (including existing ones)' : ''}. DeepSeek: ${KEY ? MODEL : 'no DEEPSEEK_API_KEY, templates only'}. Ctrl+C to stop.`);
  process.on('SIGINT', () => { void db.end().finally(() => process.exit(0)); });
  // Answer intro requests on their own loop: ONE query finds requests waiting on a demo founder, so the
  // server isn't polled once per founder. The founder approves after DELAY_MS so judges see "waiting" first.
  const seenAt = new Map<string, number>(), DELAY = Number(process.env.DELAY_MS ?? 4000);
  void (async () => { for (;;) {
    const bySide = new Map(loadSessions().map((s) => [s.participantId, s]));
    const ids = [...bySide.keys()];
    const waiting = await db.q(`select id, case when a = any($1) then a else b end as founder from matches
      where declined_by is null and ((a = any($1) and not a_approved and b_approved) or (b = any($1) and not b_approved and a_approved))`, [ids]).catch(() => []);
    for (const w of waiting) {
      const first = seenAt.get(w.id) ?? Date.now(); seenAt.set(w.id, first);
      const s = bySide.get(w.founder);
      if (!s || Date.now() - first < DELAY) continue;
      const a = await api('POST', `/api/matches/${encodeURIComponent(w.id)}/consent`, { decision: 'approve', identity: { displayName: s.displayName, contact: s.contact } }, s.cookie);
      console.log(`${new Date().toLocaleTimeString()}  ${s.alias} approved an intro -> ${a.status === 200 ? a.data?.status : `error ${a.status}`}`);
    }
    await new Promise((res) => setTimeout(res, 1000));
  } })();
  for (;;) {
    const demo = new Set(loadSessions().map((s) => s.participantId));
    const rows = await db.q(
      `select i.idea_id, i.participant_id, i.card from ideas i join participants p on p.id = i.participant_id
       where p.token_hash is not null and i.created_at >= $1 order by i.created_at`, [since]);
    for (const r of rows) {
      if (demo.has(r.participant_id) || handled.has(r.idea_id)) continue;
      handled.add(r.idea_id);
      const t0 = Date.now(), tags = controlled(r.card), ms: Record<string, number> = {};
      console.log(`${new Date().toLocaleTimeString()}  new idea "${String(r.card?.alias ?? '')}" -> tags ${JSON.stringify(tags)}`);
      try {
        const session = newSession(); // starts while DeepSeek thinks
        session.catch(() => {});
        let t = Date.now();
        const f = makeAdjacent(cached(tags) ?? (await fromDeepSeek(tags)) ?? template(tags, made), tags);
        ms.profile = Date.now() - t;
        const out = await createFounder(f, session, ms);
        made++;
        const steps = Object.entries(ms).map(([k, v]) => `${k} ${(v / 1000).toFixed(1)}s`).join(', ');
        console.log(`  ✓ ${out.alias} (${f.source}) offers ${f.offers.join(', ')} · seeks ${f.seeks.join(', ')} · ${f.interests.join(', ')} -> matched in ${((Date.now() - t0) / 1000).toFixed(1)} s (${steps})`);
        console.log(`    "${f.blurb}"`);
      } catch (e: any) {
        console.log(`  ✗ could not create an adjacent founder: ${e.message}`);
      }
    }
    await new Promise((res) => setTimeout(res, 500));
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
