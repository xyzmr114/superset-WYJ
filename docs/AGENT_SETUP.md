# WYJ agent and browser companion

WYJ now uses **OpenCode** as its agent harness, **DeepSeek V4.1 Flash** as the default model, and **OpenTUI** for the terminal companion. The web chat and terminal both call the same `/api/agent` route. The shared registry includes live web search, public page fetch, GitHub repository search, README/file reading, founder research, matching, memo generation, LinkedIn profile research, social post drafts, direct-message drafts, and connection invitation notes.

## Run locally

```sh
pnpm install
pnpm exec playwright install chromium
pnpm dev -p 3002
# In a second terminal:
pnpm tui
```

Configure `.env.local` (ignored by Git):

```dotenv
DEEPSEEK_API_KEY=your-key
AGENT_PROVIDER=deepseek
AGENT_MODEL=deepseek-flash
AGENT_HARNESS=opencode
```

`deepseek-flash` is the official API ID serving DeepSeek V4.1 Flash. Provider/model selection still uses the models.dev snapshot; other configured providers remain selectable. The direct AI SDK runner is retained for diagnostics via `AGENT_HARNESS=sdk`.

## Browser connection

Open `/agent`, click **Connect LinkedIn**, and sign in in the dedicated Chromium window. No LinkedIn developer app or pasted cookies are required. The browser profile is separate from the user's ordinary Chrome profile. Login challenges are completed by the user in that window.

The local companion can search visible LinkedIn people results, read a profile's main text, and prepare a post, message, or personalized connection invitation note in the browser. Notes are limited to 200 characters, editable, and show a live character count. The user chooses Send invitation only after the exact note has been prepared. A Premium-blocked DM card offers a connection-note alternative. OpenCode creates editable action cards; the user chooses **Prepare in browser**, then **Publish this post** or **Send this message** for the exact reviewed text. The model's tool list has no direct send/publish function. Sending requires an unambiguous composer; messages additionally require the intended profile to match a profile link in the conversation. Both dialog and full-page post composers are supported. LinkedIn may require Premium or an existing connection before a direct message; the app reports that account requirement and keeps the editable draft. Anonymized search results are returned as visible page text rather than invented names. If LinkedIn changes its UI, the action fails with an explanation rather than choosing an unrelated button.

Submission receipts are recorded before clicking the final button. An uncertain result is marked unknown and is not retried under the same action ID, including after restarting the process. The browser can also be used to complete an action manually. Disconnect clears browser cookies and closes the browser context.

The browser API accepts local loopback requests and a dedicated HttpOnly session cookie. A hosted WYJ page cannot control a visitor's existing browser; each attendee needs this local companion (an extension/remote companion transport is future work). It currently supports LinkedIn; other social network connectors are not implemented.

## OpenCode and MCP

`lib/harness/opencode.ts` launches the installed `opencode-ai` runtime on a random loopback port, uses the official JS SDK to create a WYJ session, and closes the runtime when the run finishes or is stopped. It uses a dedicated WYJ agent with application tools; the coding shell, filesystem, and delegation tools are disabled for this product agent.

`lib/agent/runner.ts` defines the shared founder tools. `lib/harness/bridge.ts` exposes them to OpenCode over MCP at `/api/harness/mcp/[run-id]`. A random bearer grant binds the tools to that run, its model input, event sink, and browser session; it expires and is revoked when the run ends. Tools validate arguments on execution. Public web/profile text is context, not instructions. `search_web` and `fetch_web_page` use DeepSeek’s Search & Fetch API with the configured DeepSeek key; the chat model can still be selected independently. Public GitHub README/file reading uses read-only unauthenticated requests so a configured personal GitHub token does not expose private repositories. Fetch tools exclude local/private URL targets and credential-bearing URLs.

Tool progress, source links, generated memos, and action cards stream back to the web/TUI clients. Model runs have up to ten steps, sixteen tool-progress calls, and a 150-second request timeout. Stop aborts the OpenCode process. At most three model runs can execute concurrently in this server process.

## Terminal commands

- Normal text: talk with WYJ.
- `/connect` or `/browser`: connect/show the local LinkedIn browser.
- `/disconnect`: close the connected browser and clear its cookies.
- `/post`: draft a LinkedIn post from the conversation.
- `/outreach`: research prospects and draft personalized outreach.
- `/memo`: create a solution memo; save it under `.wyj-runtime/memos/`.
- `/prepare N`: fill action N into its browser composer.
- `/send N`: submit the exact prepared action N.
- `/quit` or Escape: exit the terminal interface.

The terminal owns its own browser session cookie. A browser connected in the web UI is not automatically linked to the terminal; use `/connect` there to connect its session.

## Local data and confidentiality

Conversation and working draft UI state persist in the current tab's sessionStorage. Opening the same generated memo preserves manual editor changes. `/pitch?from=agent` is the personal editor with preview, copy, and download; real joint pitches use `pitchId`/`matchId` and the existing backend approvals.

Browser profiles, cookies, and receipts live under `.wyj-browser/`. OpenCode's local session database/cache and terminal memo files live under `.wyj-runtime/`. Both directories are Git-ignored, as are all real environment files. Chat history can therefore also exist in the local OpenCode session database; clearing the web conversation does not erase that runtime database. Download drafts that need to outlive a tab.

Selected messages and optionally the approved matching card go to the selected model provider. Onboarding private notes are not read by the agent. LinkedIn profile text read for outreach goes to the selected model as tool context. Login passwords and cookies are not included in model tool output. Source links support research/frameworks; GitHub popularity does not establish customer demand. Existing candidate fixtures still need replacement with participant-scoped real matching.

## Verification

`pnpm test`, `pnpm typecheck:tui`, and `pnpm build` (Webpack, with runtime browser directories excluded from build tracing) cover the shared runner, tab-state preservation, input boundaries, browser command URL restrictions, and MCP grant isolation. Live DeepSeek/OpenCode tool execution, both web/TUI action rendering, signed-in profile reading, and actual LinkedIn post-composer filling have been exercised. The Abhinav outreach test produced a draft, and LinkedIn required Premium/an existing connection to open a DM composer on the test account. A personalized 150-character connection note was then prepared in LinkedIn’s actual invitation form, without sending it. Live web search, page extraction, repository README reading, and source-file reading also succeeded. Sending/publishing must also be checked against the signed-in LinkedIn UI; do not treat unit tests as delivery verification.

## Upstream references

- [OpenCode SDK](https://docs.opencode.ai/docs/sdk/)
- [OpenCode MCP servers](https://docs.opencode.ai/docs/mcp-servers/)
- [OpenTUI React](https://github.com/anomalyco/opentui/tree/main/packages/react)
- [DeepSeek V4.1 Flash and its API ID](https://api-docs.deepseek.com/news/news260910/)

## Team integration

Abhinav: replace example matching with participant-scoped data, and add durable user quotas before shared deployment. Anusha: `/agent` and `/pitch?from=agent` are ready to link from the main flow; real mutual matches use the existing joint pitch routes. Vernika: extend the shared tools in `createFounderRun`, which makes the same capability available to OpenCode and the direct diagnostic runner.
