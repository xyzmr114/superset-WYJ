# Web agent setup

Implemented: `/agent`, a bounded tool loop using AI SDK, native Anthropic/Google adapters, compatible-endpoint adapters, a models.dev registry snapshot, streamed tool progress, GitHub search, example counterpart matching, founder research, and memo creation.

## Credentials

Set provider credentials in `.env.local`; restart Next.js. For OpenRouter:

```dotenv
OPENROUTER_API_KEY=your-key
AGENT_PROVIDER=openrouter
AGENT_MODEL=nvidia/nemotron-3.5-lightning:free
# Set a room code before exposing a shared paid endpoint.
AGENT_ACCESS_CODE=choose-a-room-code
```

The browser model picker uses the models.dev snapshot. The server resolves the adapter and looks for the provider's declared env variables. Credentials never enter browser responses. Unsupported native adapters are visibly unavailable; a catalog listing is not a guarantee the harness can execute it. Generic compatible providers use their catalog endpoint; Anthropic and Google use native SDKs. Common compatible endpoints also include Groq, xAI, Mistral, Together, and Cerebras. Actual provider quotas/model availability may differ from catalog metadata.

Catalog snapshot: `lib/agent/catalog.snapshot.json`, sourced from `https://models.dev/api.json?type=all` on 2026-10-22, MIT-licensed upstream. Only tool-capable text models are retained. Refresh deliberately, review endpoint changes, and commit a new snapshot; don't load remote code or redirect secrets using client-supplied URLs.

## Runtime

The loop is capped at five model steps, eight tool calls, and 55 seconds. Client Stop aborts the request. At most three concurrent runs per server process. `AGENT_ACCESS_CODE` is a hackathon gate, not production identity/rate limiting. Before public scale, bind authenticated participant sessions and implement durable per-user quotas. Backend consent APIs are untouched.

Messages and the optionally included matching card are sent to the selected model provider. The onboarding private notes are never read. Chat history is held in browser memory. Only a memo explicitly opened in the editor is briefly transferred through sessionStorage; the editor removes that transfer key after loading it.

Example candidate data remains clearly identified; replace the candidate adapter with authenticated database results when Abhinav's backend is ready. Do not silently treat example candidates as real attendees. Public search results are untrusted context and only show technical alternatives, not customer demand.

Memo transfer opens a personal working draft with no approvals. It does not create a shared server pitch. After the actual match backend is ready, create a pitch via the existing authenticated endpoint and use its real ID.

## Integration

- Vernika: improve the system prompt and tool implementations in `lib/agent/runner.ts`; reuse your generation/evidence module when ready.
- Abhinav: authenticate the agent endpoint and replace example matching with your participant-scoped database query.
- Anusha: `/agent` is ready to link from the main experience. Provider selector uses TanStack Query.
- Telegram: not implemented yet. Call this same runner from a separate adapter after participant linking is available; no fork required.

## Verification

`pnpm test` validates input boundaries, provider adapter selection, and memo rendering. A real model run requires configured credentials; don't call mocked responses a live provider test.
