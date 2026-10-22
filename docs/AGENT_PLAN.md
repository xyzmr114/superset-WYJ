# Agent and messaging decision

Decision for the hackathon: keep the Next.js application and add one bounded agent workflow in TypeScript. This is a plan, not implemented agent functionality.

## Workflow

Accept a goal → inspect the approved matching card → ask one important missing question or choose a tool → observe tool results → draft an evidence-backed recommendation. Stop with a result or a question; limit a run to 5 model steps and a total timeout. Resume on the next message. Stream real progress events to the web UI.

Initial tool contracts: `find_candidates`, `search_public_projects`, `get_founder_framework`, `draft_solution_memo`. Reuse existing matching, evidence, and framework modules. Tool results need source URLs and errors. Server binds the participant identity; the model cannot select another participant's credentials. Introduction approvals remain explicit application actions. Never have the model infer consent from prose.

Do not send browser-only private intake to a hosted model without changing the product disclosure and getting the user's choice. Agent input starts with approved card fields. Telegram messages are channel messages processed by that service, not browser-local private notes.

## Telegram

After the web workflow works, add Telegram as a second interface to the same runner. Needed: a bot token, model provider key, participant/account linking, and either a persistent polling worker or a deployed webhook. For a local hackathon demo a separate polling worker avoids configuring an inbound webhook. Deduplicate update IDs and isolate each participant's conversation. No other social networks in the first iteration.

Suggested commands: `/start` to link participant, `/match` to find counterparts, `/pitch` to prepare the current draft. Initial send scope is replies in the requesting participant's chat. Do not add unsolicited outbound messaging.

## Hermes / MCP

Hermes offers a messaging gateway and MCP integration. If adopted later, run it alongside the web app and expose the four application tools; avoid a fork unless changing Hermes itself is necessary. A multi-user shared gateway still needs application-level identity binding and isolated sessions. MCP provides the tool interface, not the agent's decisions or the application database.

- Official repo: https://github.com/NousResearch/hermes-agent
- Telegram setup: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram

Owner coordination: Vernika owns model/evidence generation; Abhinav owns authenticated tool execution/session linking. Integration lead owns chat UI and channel adapter after the main demo path works. Do not implement a parallel second matching or consent backend.
