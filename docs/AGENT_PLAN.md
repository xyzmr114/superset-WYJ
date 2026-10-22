# Current agent plan: private founder matchmaking

Authoritative scope: [PIVOT.md](../PIVOT.md). Assignments: [four-person handoff](../WOULD_YOU_JUMP_HANDOFF.md).

## Agent responsibilities

- Read the owner's self-submitted profile and goals locally.
- Suggest a bounded set of skill/interest labels through Laya when available; uncertain fields remain editable.
- Prepare an exact brief preview from user-approved fields.
- Compare approved counterpart briefs and explain complementarity.
- Keep the owner's private constraints local when deciding whether to explore a proposal.
- Ask for explicit application-level consent before publication or identity reveal.

Consent is a server-enforced action, not a model decision. Models cannot select another participant's identity or approve on their behalf.

## Information flow

Private input → local classifier → suggested labels → user's edited approved brief → shared deterministic matcher → in-app proposal → each participant's consent → scoped reveal.

A cloud model is optional and outside the first working demo. If later used, it receives approved brief fields only. It never receives raw profiles, local private goals or identity records. LinkedIn browser automation, reply monitoring, Telegram, OpenTUI and external messaging are not part of this pivot's critical path.

## Runtime

Laya is https://github.com/NandhaKishorM/laya, a classifier rather than a generative chat model. Browser-local ONNX is preferred; an own-device loopback companion is acceptable if clearly identified. A central server running a model locally does not establish per-user on-device privacy.

Validate narrow labels and missing/negated statements before making quality claims. Keep the manual reviewed brief path working if classification is unavailable. Never escalate private text to a hosted model to hide a local failure.
