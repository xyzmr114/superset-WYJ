// End-to-end backend acceptance checks for "Would You Jump?".
// Usage: BASE_URL=http://localhost:3000 npx tsx scripts/acceptance.ts
// Optional: EVENT_CODE (default SUPERSET). Requires a running server; no dependencies (Node 20 fetch).
// Run against a clean event: leftover profiles from earlier runs tie with these and can push the
// expected partner out of the top 3. On Supabase, clear first (db/README.md, "wipe the event").

export {};

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const EVENT_CODE = process.env.EVENT_CODE ?? 'SUPERSET';
const RUN = `${Date.now()}`;

let failures = 0;
let passes = 0;

function check(name: string, ok: boolean, detail?: unknown): boolean {
  if (ok) {
    passes++;
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail === undefined ? '' : ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
  }
  return ok;
}

type Res = { status: number; text: string; json: any };

class Jar {
  private cookies = new Map<string, string>();
  constructor(public label: string) {}

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  store(res: Response) {
    for (const sc of res.headers.getSetCookie()) {
      const pair = sc.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === '' || /max-age=0/i.test(sc)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async req(method: string, path: string, body?: unknown): Promise<Res> {
    const headers: Record<string, string> = {};
    const c = this.header();
    if (c) headers.cookie = c;
    if (method !== 'GET') {
      headers.origin = BASE_URL;
      headers['content-type'] = 'application/json';
    }
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
        redirect: 'manual',
      });
    } catch (e) {
      return { status: 0, text: String(e), json: null };
    }
    this.store(res);
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* non-JSON (e.g. markdown export) */ }
    return { status: res.status, text, json };
  }

  get(path: string) { return this.req('GET', path); }
  post(path: string, body?: unknown) { return this.req('POST', path, body); }
  put(path: string, body?: unknown) { return this.req('PUT', path, body); }
}

const enc = encodeURIComponent;
const is4xx = (s: number) => s >= 400 && s < 500;
const brief = (r: Res) => `status ${r.status}: ${r.text.slice(0, 300)}`;

class Abort extends Error {}
function require_(name: string, ok: boolean, detail?: unknown) {
  if (!check(name, ok, detail)) throw new Abort(name);
}

async function main() {
  console.log(`Acceptance run ${RUN} against ${BASE_URL} (event ${EVENT_CODE})`);

  const A = new Jar('A');
  const B = new Jar('B');
  const C = new Jar('C');
  const aliasA = `Accept A ${RUN}`;
  const aliasB = `Accept B ${RUN}`;
  const canaryA = `A-CANARY-CONTACT-${RUN}`;
  const canaryB = `B-CANARY-CONTACT-${RUN}`;

  // 1. Sessions + identities
  for (const jar of [A, B, C]) {
    const r = await jar.post('/api/session', { eventCode: EVENT_CODE });
    require_(`1. ${jar.label} creates session`, r.status === 200 && !!r.json?.participantId && jar.header() !== '', brief(r));
  }
  {
    const ra = await A.put('/api/me/identity', { displayName: `Alice ${RUN}`, contact: canaryA });
    check('1. A saves identity ({saved:true})', ra.status === 200 && ra.json?.saved === true, brief(ra));
    check('1. A identity response does not echo contact', !ra.text.includes(canaryA), ra.text);
    const rb = await B.put('/api/me/identity', { displayName: `Bob ${RUN}`, contact: canaryB });
    check('1. B saves identity ({saved:true})', rb.status === 200 && rb.json?.saved === true, brief(rb));
    check('1. B identity response does not echo contact', !rb.text.includes(canaryB), rb.text);
  }

  // 2. Cards
  const cardA = {
    alias: aliasA, offers: ['engineering'], seeks: ['sales'], interests: ['developer-tools'],
    availability: 'weekends', approvedBlurb: 'Backend engineer exploring developer tools.',
  };
  const cardB = {
    alias: aliasB, offers: ['sales'], seeks: ['engineering'], interests: ['developer-tools'],
    availability: 'weekends', approvedBlurb: 'Dev-tools seller looking for a backend cofounder.',
  };
  {
    const noConsent = await A.put('/api/me/card', cardA);
    check('2. card without publishConsent rejected (4xx)', is4xx(noConsent.status), brief(noConsent));
    const ra = await A.put('/api/me/card', { ...cardA, publishConsent: true });
    require_('2. A publishes card', ra.status === 200 && ra.json?.alias === aliasA, brief(ra));
    const rb = await B.put('/api/me/card', { ...cardB, publishConsent: true });
    require_('2. B publishes card', rb.status === 200 && rb.json?.alias === aliasB, brief(rb));
  }

  // 3. Matching
  const gen = await A.post('/api/matches/generate', {});
  const genMatches: any[] = Array.isArray(gen.json?.matches) ? gen.json.matches : [];
  const matchA = genMatches.find((m) => m?.candidate?.alias === aliasB);
  require_('3. A generate returns match with B as candidate', gen.status === 200 && !!matchA?.id, brief(gen));
  const matchId: string = matchA.id;
  const mPath = `/api/matches/${enc(matchId)}`;
  {
    const lb = await B.get('/api/matches');
    const bList: any[] = Array.isArray(lb.json?.matches) ? lb.json.matches : Array.isArray(lb.json) ? lb.json : [];
    const mB = bList.find((m) => m?.id === matchId);
    check('3. B sees the same match id', lb.status === 200 && !!mB, brief(lb));
    check('3. B sees A as candidate', mB?.candidate?.alias === aliasA, mB?.candidate);
  }

  // 4. A approves -> pending, nothing revealed
  {
    const r = await A.post(`${mPath}/consent`, { decision: 'approve' });
    check('4. A approve -> status pending', r.status === 200 && r.json?.status === 'pending', brief(r));
    check('4. A consent response has no B contact / revealedContact', !r.text.includes(canaryB) && !r.text.includes('"revealedContact"'), r.text.slice(0, 300));
    const ga = await A.get(mPath);
    check('4. A GET match: pending', ga.status === 200 && ga.json?.status === 'pending', brief(ga));
    check('4. A GET match: no B contact / revealedContact', !ga.text.includes(canaryB) && !ga.text.includes('"revealedContact"'), ga.text.slice(0, 300));
    const la = await A.get('/api/matches');
    check('4. A list: no B contact / revealedContact', !la.text.includes(canaryB) && !la.text.includes('"revealedContact"'));
    const gb = await B.get(mPath);
    check('4. B GET match: ok, no A contact / revealedContact', gb.status === 200 && !gb.text.includes(canaryA) && !gb.text.includes('"revealedContact"'), brief(gb));
    const lb = await B.get('/api/matches');
    check('4. B list: no A contact / revealedContact', !lb.text.includes(canaryA) && !lb.text.includes('"revealedContact"'));
  }

  // 5. Outsider C
  {
    const g = await C.get(mPath);
    check('5. C GET match -> 404', g.status === 404, brief(g));
    const c = await C.post(`${mPath}/consent`, { decision: 'approve' });
    check('5. C consent -> 404', c.status === 404, brief(c));
    check('5. C responses leak no contacts', ![g.text, c.text].some((t) => t.includes(canaryA) || t.includes(canaryB)));
  }

  // 6. Idempotent approve, then mutual reveal
  {
    const again = await A.post(`${mPath}/consent`, { decision: 'approve' });
    check('6. A approves again -> still pending', again.status === 200 && again.json?.status === 'pending', brief(again));
    const la = await A.get('/api/matches');
    const aList: any[] = Array.isArray(la.json?.matches) ? la.json.matches : Array.isArray(la.json) ? la.json : [];
    const withB = aList.filter((m) => m?.candidate?.alias === aliasB);
    const sameId = aList.filter((m) => m?.id === matchId);
    check('6. no duplicate match in A list', withB.length === 1 && sameId.length === 1, { withB: withB.length, sameId: sameId.length });

    const rb = await B.post(`${mPath}/consent`, { decision: 'approve' });
    check('6. B approve -> revealed', rb.status === 200 && rb.json?.status === 'revealed', brief(rb));
    const ga = await A.get(mPath);
    check("6. A sees B's contact", ga.json?.status === 'revealed' && ga.json?.revealedContact?.contact === canaryB, ga.json?.revealedContact ?? brief(ga));
    const gb = await B.get(mPath);
    check("6. B sees A's contact", gb.json?.status === 'revealed' && gb.json?.revealedContact?.contact === canaryA, gb.json?.revealedContact ?? brief(gb));
  }

  // 7. Card frozen after matching
  {
    const r = await A.put('/api/me/card', { ...cardA, approvedBlurb: 'Edited after match.', publishConsent: true });
    check('7. A card update after matching -> 409', r.status === 409, brief(r));
  }

  // 8. Pitch creation + authorization
  const pr = await A.post(`${mPath}/pitch`, {});
  require_('8. A creates pitch -> PitchView version 1', pr.status === 200 && !!pr.json?.id && pr.json?.version === 1, brief(pr));
  const pitchId: string = pr.json.id;
  const pPath = `/api/pitches/${enc(pitchId)}`;
  check('8. pitch matchId matches', pr.json?.matchId === matchId, pr.json?.matchId);
  check('8. pitch markdown contains neither canary', typeof pr.json?.markdown === 'string' && !pr.json.markdown.includes(canaryA) && !pr.json.markdown.includes(canaryB));
  {
    const cg = await C.get(pPath);
    check('8. C GET pitch -> 404', cg.status === 404, brief(cg));
    const ex = await A.get(`${pPath}/export`);
    check('8. A export before approvals -> 403', ex.status === 403, brief(ex));
  }

  // 9. Versioning and stale approvals
  {
    const ap = await A.post(`${pPath}/approve`, { version: 1 });
    check('9. A approves version 1', ap.status === 200 && ap.json?.myApproval === true, brief(ap));
    const markdownV2 = `${pr.json.markdown}\n\nEdited by B in run ${RUN}.\n`;
    const ed = await B.put(pPath, {
      expectedVersion: 1,
      markdown: markdownV2,
      proposedIdentityFields: { me: ['contact'], them: ['displayName'] },
    });
    check('9. B edit with expectedVersion 1 -> version 2', ed.status === 200 && ed.json?.version === 2, brief(ed));
    const ra = await A.get(pPath);
    check('9. A re-read: version 2, myApproval false', ra.status === 200 && ra.json?.version === 2 && ra.json?.myApproval === false, brief(ra));
    const stale = await A.post(`${pPath}/approve`, { version: 1 });
    check('9. A approve stale version 1 -> 409', stale.status === 409, brief(stale));
    const stalePut = await A.put(pPath, { expectedVersion: 1, markdown: 'stale edit', proposedIdentityFields: { me: [], them: [] } });
    check('9. A PUT with expectedVersion 1 -> 409', stalePut.status === 409, brief(stalePut));
  }

  // 10. Mutual approval + export
  {
    const a2 = await A.post(`${pPath}/approve`, { version: 2 });
    check('10. A approves version 2', a2.status === 200, brief(a2));
    const b2 = await B.post(`${pPath}/approve`, { version: 2 });
    check('10. B approves version 2', b2.status === 200, brief(b2));
    const ra = await A.get(pPath);
    check('10. bothApproved and exportable', ra.json?.version === 2 && ra.json?.bothApproved === true && ra.json?.exportable === true, brief(ra));
    const ex = await A.get(`${pPath}/export`);
    check('10. A export -> 200', ex.status === 200, brief(ex));
    check("10. export contains B's contact (B proposed 'contact')", ex.text.includes(canaryB));
    check("10. export does NOT contain A's contact (B's 'them' ignored)", !ex.text.includes(canaryA));
  }

  // 11. Per-pair identity snapshots (handoff: introduction consent contract)
  {
    const D = new Jar('D');
    const E = new Jar('E');
    const aliasD = `Snap D ${RUN}`, aliasE = `Snap E ${RUN}`;
    const dSnap = `D-SNAPSHOT-${RUN}`, dLater = `D-CHANGED-LATER-${RUN}`, dRetry = `D-RETRY-${RUN}`;
    const eProfile = `E-PROFILE-${RUN}`, eLater = `E-CHANGED-LATER-${RUN}`;
    for (const [j, alias, offers, seeks] of [[D, aliasD, ['engineering'], ['sales']], [E, aliasE, ['sales'], ['engineering']]] as const) {
      require_(`11. ${j.label} joins`, (await j.post('/api/session', { eventCode: EVENT_CODE })).status === 200);
      require_(`11. ${j.label} publishes card`, (await j.put('/api/me/card', {
        alias, offers, seeks, interests: ['developer-tools'], availability: 'weekends',
        approvedBlurb: `Snapshot test ${RUN}`, publishConsent: true,
      })).status === 200);
    }
    const noId = await D.post('/api/matches/generate', {});
    const dm = (noId.json?.matches ?? []).find((m: any) => m.candidate?.alias === aliasE);
    require_('11. D and E are matched', !!dm, brief(noId));
    const mp = `/api/matches/${enc(dm.id)}`;

    const missing = await D.post(`${mp}/consent`, { decision: 'approve' });
    check('11. approve with no identity anywhere -> 400 IDENTITY_REQUIRED', missing.status === 400 && missing.json?.error?.code === 'IDENTITY_REQUIRED', brief(missing));

    const dApprove = await D.post(`${mp}/consent`, { decision: 'approve', identity: { displayName: 'D pair name', contact: dSnap } });
    check('11. D approves with a pair-specific identity -> pending', dApprove.status === 200 && dApprove.json?.status === 'pending', brief(dApprove));
    const eBefore = await E.get(mp);
    check("11. E can't see D's snapshot after one approval", eBefore.status === 200 && !eBefore.text.includes(dSnap) && !('revealedContact' in (eBefore.json ?? {})), brief(eBefore));

    const dChange = await D.put('/api/me/identity', { displayName: 'D changed', contact: dLater });
    check('11. D changes global identity afterwards', dChange.status === 200, brief(dChange));
    const dAgain = await D.post(`${mp}/consent`, { decision: 'approve', identity: { displayName: 'D retry', contact: dRetry } });
    check('11. D approving again is a no-op (still pending)', dAgain.status === 200 && dAgain.json?.status === 'pending', brief(dAgain));

    require_('11. E saves a profile identity', (await E.put('/api/me/identity', { displayName: 'E name', contact: eProfile })).status === 200);
    const eApprove = await E.post(`${mp}/consent`, { decision: 'approve' }); // no identity: snapshot of E's profile now
    check('11. E approves (profile snapshot) -> revealed', eApprove.status === 200 && eApprove.json?.status === 'revealed', brief(eApprove));
    require_('11. E changes global identity after approving', (await E.put('/api/me/identity', { displayName: 'E changed', contact: eLater })).status === 200);

    const eSees = await E.get(mp);
    check("11. E sees D's approved snapshot", eSees.json?.revealedContact?.contact === dSnap, brief(eSees));
    check("11. E doesn't see D's later profile change or retried identity", !eSees.text.includes(dLater) && !eSees.text.includes(dRetry), brief(eSees));
    const dSees = await D.get(mp);
    check("11. D sees E's profile as it was at approval", dSees.json?.revealedContact?.contact === eProfile, brief(dSees));
    check("11. D doesn't see E's later profile change", !dSees.text.includes(eLater), brief(dSees));
    const out = await C.get(mp);
    check('11. outsider C still gets 404', out.status === 404 && !out.text.includes(dSnap), brief(out));
  }
}

main()
  .catch((e) => {
    if (e instanceof Abort) console.log(`ABORT  later checks skipped after: ${e.message}`);
    else { failures++; console.log(`FAIL  unexpected error -- ${e?.stack ?? e}`); }
  })
  .finally(() => {
    console.log(`\n${passes} passed, ${failures} failed`);
    process.exit(failures > 0 ? 1 : 0);
  });
