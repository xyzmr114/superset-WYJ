/**
 * Seeds synthetic participants into a running demo server through the public API, so the
 * room has labeled counterparts before the two live devices join.
 *
 *   pnpm seed [baseUrl] [--event CODE] [--all]
 *
 * baseUrl defaults to BASE_URL, then http://localhost:3000. The event code defaults to
 * EVENT_CODE, then SUPERSET. By default only the four distractor profiles are seeded,
 * because the laptop and phone play Founder A and Founder B live; --all seeds all six.
 * Every seeded card is labeled synthetic in its alias and blurb, and every identity uses
 * an example.invalid address. Run once per server start: the server keeps state in memory.
 */
import type { MatchingCard } from '../lib/contracts';
import { distractors, profiles } from '../fixtures/profiles';

const SYNTHETIC_LABEL = 'Synthetic · ';

class NotImplemented extends Error {}
class SeedError extends Error {}

/** One per participant: each synthetic person has their own session cookie. */
class CookieJar {
  private cookies = new Map<string, string>();
  store(response: Response) {
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  header() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }
  get size() { return this.cookies.size; }
}

function parseArgs(argv: string[]) {
  let base = process.env.BASE_URL || 'http://localhost:3000';
  let eventCode = process.env.EVENT_CODE || 'SUPERSET';
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') all = true;
    else if (arg === '--event') eventCode = argv[++i] ?? eventCode;
    else if (arg.startsWith('--event=')) eventCode = arg.slice('--event='.length);
    else if (!arg.startsWith('-')) base = arg;
    else throw new SeedError(`Unknown option ${arg}. Usage: pnpm seed [baseUrl] [--event CODE] [--all]`);
  }
  let url: URL;
  try { url = new URL(base); } catch { throw new SeedError(`Not a valid base URL: ${base}`); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new SeedError(`Base URL must be http or https: ${base}`);
  return { base: url.origin, eventCode, all };
}

async function call(base: string, jar: CookieJar, method: string, path: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(jar.size ? { Cookie: jar.header() } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SeedError(`Could not reach ${base}. Is the server running?`);
  }
  if (response.status === 501) throw new NotImplemented(path);
  const data = await response.json().catch(() => null) as { error?: { code: string; message: string } } | null;
  if (!response.ok) {
    const detail = data?.error ? `${data.error.code}: ${data.error.message}` : `HTTP ${response.status}`;
    throw new SeedError(`${method} ${path} failed (${detail})`);
  }
  jar.store(response);
  return data;
}

const labeled = (p: MatchingCard) => ({
  alias: p.alias.startsWith(SYNTHETIC_LABEL) ? p.alias : SYNTHETIC_LABEL + p.alias,
  offers: p.offers, seeks: p.seeks, interests: p.interests, availability: p.availability,
  approvedBlurb: /^synthetic/i.test(p.approvedBlurb) ? p.approvedBlurb : `Synthetic profile. ${p.approvedBlurb}`,
  publishConsent: true,
});

async function seedOne(base: string, eventCode: string, profile: MatchingCard) {
  const jar = new CookieJar();
  const session = await call(base, jar, 'POST', '/api/session', { eventCode }) as { participantId: string; eventId: string };
  if (!jar.size) throw new SeedError('POST /api/session returned no session cookie.');
  await call(base, jar, 'PUT', '/api/me/identity', {
    displayName: `${profile.alias} (synthetic)`,
    contact: `${profile.id}@example.invalid`,
  });
  const card = await call(base, jar, 'PUT', '/api/me/card', labeled(profile)) as MatchingCard;
  return { session, card };
}

async function main() {
  const { base, eventCode, all } = parseArgs(process.argv.slice(2));
  const targets = all ? profiles : distractors;
  console.log(`Seeding ${targets.length} synthetic participants into ${base} (event ${eventCode})`);
  for (const profile of targets) {
    const { session, card } = await seedOne(base, eventCode, profile);
    console.log(`  ✓ ${card.alias.padEnd(22)} participant ${session.participantId}  ${card.interests.join(', ')}  offers ${card.offers.join(', ')}`);
  }
  console.log('Done. Seeded cards stay until the server restarts.');
}

main().catch(err => {
  if (err instanceof NotImplemented) {
    console.log(`The demo API is not implemented on this server yet (${err.message} returned 501).`);
    console.log('Nothing was seeded. Merge or deploy the backend routes, then run pnpm seed again.');
    return;
  }
  console.error(err instanceof SeedError ? `Seed failed: ${err.message}` : err);
  process.exitCode = 1;
});
