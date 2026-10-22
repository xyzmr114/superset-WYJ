# Setup for the private founder matchmaking pivot

Read [PIVOT.md](../PIVOT.md) and the [current four-person handoff](../WOULD_YOU_JUMP_HANDOFF.md) first. This replaces the earlier social/browser-agent setup as the product's primary path.

## Web app

```sh
pnpm install
pnpm dev -- --port 3002
```

Core session, matching and consent APIs need no model key. With `DATABASE_URL`, apply `pnpm db:migrate` for Postgres persistence (including ideas and trials). Without it, PGlite resets on restart and supports one server process. `.env.local` may still contain ignored credentials used by earlier experiments; do not copy them into client code or commits.

## Local Laya evaluation — Vernika

The integration laptop has Python 3.12 and `laya==0.4.13` installed in `.wyj-local/venv`. That installation has not yet loaded weights or established founder-domain accuracy.

```sh
.wyj-local/venv/bin/python -c "import laya; print(laya.__version__)"
```

On another machine, use Python >=3.10 in an isolated virtual environment and install Laya from its documented package. Model weights download on first inference. Keep environments, weights, caches and private text under ignored `.wyj-local/` or another ignored runtime directory.

- Main docs: https://github.com/NandhaKishorM/laya
- ONNX browser runtime: https://github.com/NandhaKishorM/laya/blob/main/laya-ts/README.md
- Accuracy/negation limits: https://github.com/NandhaKishorM/laya/blob/main/BENCHMARKS.md

If using a companion, bind only `127.0.0.1`, restrict CORS to the configured WYJ origin and do not log bodies. The browser must call that user's own companion directly; do not proxy private profile text through the shared Next server. Tunnel/HTTPS/private-network browser behavior needs testing before claiming multi-device support.

## Legacy code

The repo retains the previous OpenCode/browser/LinkedIn/TUI modules for recovery. They are not the private classifier and must not receive raw profiles in the new flow. Existing cloud profile-reading tools are not a privacy-preserving implementation of this pivot.

The unpushed evidence-board experiment is preserved in the local Git stash named `WIP evidence board before consent-first pivot`. It is not part of the new implementation or something teammates need to apply.

## Verification

Run `pnpm test`, `pnpm typecheck`, and the integration build after changes. Prove the privacy boundary by inspecting actual requests; prove reveal gating with independent participant sessions and an outsider session. Check that each approval binds to the exact identity fields and brief version approved.
