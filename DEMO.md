# Would You Jump? — demo kit

Laptop = **Founder A ("Builder")**. Phone = **Founder B ("Signal")**. Everyone else in the room list is a labeled synthetic profile.

## Before you rely on this (re-checked on 22 Oct after merging into `main`)

Done:

- [x] **Screens call the API.** Join creates the session, onboarding publishes the card and identity, matches generates, polls every 3 seconds and sends consent, and the pitch link opens the server draft.
- [x] **Journey works end to end through the API** (two test sessions): match with live evidence, pending with no identity after one approval, reveal after both, pitch refused before reveal, export refused until both approve, and an edit bumps the version and blocks export again. A third session gets 404 on that match.
- [x] **Event code agrees.** Join defaults to `SUPERSET`, which is the server's default `EVENT_CODE`.
- [x] **No synthetic copy of A or B.** The server pre-loads only the four distractors, so the real phone is the laptop's top match with no tie.

Still open:

- [ ] **Run it once on two real devices.** Everything above was checked through the API, not by tapping through the screens on a laptop and a phone.
- [ ] **Don't run `pnpm seed` against this server.** It already pre-loads the four distractors, so seeding adds a second copy of each (Canvas showed up twice in testing). The seed script is for a server that doesn't pre-load them.
- [ ] **Recognizability warning on the card preview.** The preview shows exactly what will be shared, but it doesn't yet warn that specific free-text tags can identify someone or suggest keeping them general. The anonymity answer below relies on that advice, so add the warning to the preview or say it aloud during the demo.
- [ ] **One server process.** State is in memory, so it resets on restart and does not work across multiple instances (for example serverless hosting).
- [ ] **Privacy acceptance check.** Type `PRIVATE-RUNWAY-7731` into intake and confirm it appears in no request, log, pitch draft or export (DevTools → Network → search).

## Two-device setup checklist (T-30 minutes)

- [ ] **URL:** `__________________` (one `pnpm build && pnpm start` process, behind an HTTPS tunnel or on one long-running host).
- [ ] **Env:** `EVENT_CODE` matches the code on the slide. Set `GITHUB_TOKEN`, because unauthenticated search allows only 10 requests a minute. `MODEL_API_URL` / `MODEL_API_KEY` / `MODEL_NAME` are optional; leave them empty unless the model path was rehearsed.
- [ ] **Fresh state:** restart the server. It comes back with the four labeled synthetic distractors and nothing else. A rehearsal freezes cards and creates matches, so restart after every rehearsal.
- [ ] **Clean browsers:** open a private window on the laptop and a private tab on the phone, or clear cookies for the URL on both.
- [ ] **Phone (B) ready first:** join, publish B's card (offers product + sales, seeks engineering, developer-tools, exploring) and fill in the identity fields. B must exist before A asks for matches.
- [ ] **Laptop (A):** join page open, not submitted.
- [ ] **QR code** for the join URL is on the slide or printed, and scanning it from the phone works.
- [ ] **Phone visible to the room:** mirroring or document camera, notifications off, auto-lock off, brightness up.
- [ ] **Fallbacks ready:** backup video open in a tab, and the local run tested (see below).

## 90-second demo

| Time | Device | Do | Say |
|---|---|---|---|
| 0:00 | — | Opening hook (below). | |
| 0:10 | Laptop (A) | Join. In private intake, type a condition such as "need 6 months of runway first". Fill A's card (engineering + data, seeks sales + product, developer-tools, weekends) and open the publication preview. | "My condition stays in this tab. The preview is exactly what others can see, and the condition isn't in it." |
| 0:25 | Laptop (A) | Open matches. Point at the anonymous card for Signal, the score reasons, the company hypothesis and the source links, including the live or "saved snapshot" label. | "An anonymous counterpart, a hypothesis to test, and public projects that show related tooling exists. This is not proof of demand." |
| 0:40 | Laptop (A) | Show the local checklist: "worth exploring; runway still unresolved". | "This check runs on my device against my private condition. It can't see B's situation." |
| 0:50 | Laptop (A) | Approve the introduction. Status shows pending, with no name. | "I said yes. I still don't know who it is." |
| 1:00 | Phone (B) | Approve. Within about 3 seconds both screens show the other person's identity. | "Names appear only when both people say yes." |
| 1:10 | Both | Open the joint pitch. Both approve version 1; export becomes available. Download the Markdown. | "Both founders approve the exact same version before anything can leave." |
| 1:20 | — | Close (below). | |

## Fallback plan

- **GitHub down or rate-limited:** nothing to do. Evidence switches to the saved snapshot (Plane, Chatwoot, Sentry) and says so. Say: "GitHub is limiting us, so these are saved results, labeled as saved." Prevention: set `GITHUB_TOKEN`.
- **Model down, slow or not configured:** nothing to do. After 15 seconds, or on any error, the opportunity comes from the fixed template and the draft says "Drafted from a fixed template". The template is the predictable choice for a live demo.
- **Wifi down:** start the app on the laptop and connect the phone to the laptop's hotspot at `http://<laptop-ip>:3000`. Use `pnpm dev` for this, not `pnpm start`, because production session cookies require HTTPS. The server starts fresh with the distractors loaded. If that fails too, play the backup video: one full rehearsal, 90 seconds or less, with captions. Narrate over it, and say it is a recording.

## Opening hook (3 sentences)

There's someone in this room you could start a company with, and you'll probably never find out. The people best placed to start companies are often the ones who can't say out loud that they're thinking about leaving. Would You Jump? helps them find a complementary cofounder and a concrete first experiment, without either person publishing their plans to quit.

## Close (2 sentences)

We help people find the team and first experiment that make starting a company possible, before they announce they are leaving. Nobody had to say they were leaving, and no names moved until both people said yes.

## Business story for super{set} (our hypothesis)

Our user is an experienced builder, usually employed, who is quietly considering a company and won't post on a cofounder board because being seen looking has a cost. We would reach them first through hackathons and founder communities, where they already gather. The likely payer is an accelerator or venture studio that wants complementary, problem-focused founding teams earlier than an application form finds them. Willingness to pay is untested, and we would never sell or score anyone's private intentions. We would measure onboarding completion, mutually accepted introductions, and how many pairs commit to a concrete 48-hour validation experiment. Funding and income are possible later outcomes, not demo metrics or promises. We think this fits super{set}'s studio model because its public [approach](https://superset.com/approach) describes building companies around a focused first product and a specific business problem with data at the center, and a tool that forms complementary teams around a testable problem would feed that model. This is our reading of their public material, not something super{set} has reviewed or endorsed.

## Likely judge questions

**How is private data protected?**
Private intake (ambition, money and runway conditions) stays in that browser tab's memory. It is never sent in a request, stored, logged or given to the model, and refreshing erases it. Only the separately approved matching card is published. Name and contact are stored apart from the card and released only when both people approve that specific match. Sessions use an HttpOnly cookie, and the server never trusts an ID sent by the browser. This protects you from other participants, not from the people running the app, and we say that plainly.

**Isn't the room too small to stay anonymous?**
Partly, yes, and more so now that cards accept free-text skills and interests. An entry like "Rust, payments reconciliation, weekends" can point to one person in a room of 40, so we don't claim cards are anonymous. Before publishing, the card preview shows exactly what will be shared, and our advice is to keep tags general: "engineering" rather than a niche stack, "payments" rather than a specific product. What stays protected either way is the private condition, which never leaves your device, and your name and contact, which wait for mutual consent. Anonymity improves as the pool spans several events or communities.

**Why would super{set} care?**
Our hypothesis is that it gets complementary teams already formed around a specific problem, with a first experiment chosen, earlier than they would otherwise apply. That fits a studio that builds companies with founders. We haven't validated this with super{set}.

**What's real vs mocked?** (update after the final merge)

| Part | Status |
|---|---|
| Match scoring | Real and deterministic. Score reasons are shown and framed as a heuristic, not a prediction. |
| Public evidence | Real GitHub repository search, cached 15 minutes, with a labeled saved snapshot when it fails. |
| Opportunity and pitch text | Fixed template by default. A model drafts it only when configured, and the draft is labeled either way. |
| Sessions, cards, consent, reveal, pitch approval and export | Implemented as server routes with an in-memory store that resets on restart. |
| Screens wired to those routes | Yes. Join, onboarding, matches, consent, reveal and the pitch workspace call the server. |
| Other people in the room | Four synthetic distractors, labeled "Synthetic". Founders A and B are real sessions on the two devices. |
| Customers, demand, endorsements | None claimed. Everything is a hypothesis to test. |
