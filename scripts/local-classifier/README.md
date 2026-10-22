# Local Laya classifier: smoke test

Checks whether Laya (https://github.com/NandhaKishorM/laya) can suggest brief labels from a founder's own profile text. Everything runs on this laptop. Snippets in `cases.json` are synthetic, and results print case ids only.

```sh
python3.12 -m venv .wyj-local/venv
.wyj-local/venv/bin/python -m pip install 'laya==0.4.13'
cd scripts/local-classifier
HF_HUB_CACHE=../../.wyj-local/hf ../../.wyj-local/venv/bin/python smoke.py --model english
```

The first run downloads the checkpoint into ignored `.wyj-local/hf` (about 1.4 GB for `english` and `multilingual` together).

## Questions

`questions.py` asks one yes/no (`noul`) question per label: 5 skills offered, 5 skills sought and 6 interests (the `INTERESTS` tags in `lib/contracts.ts`, including `travel` and `ai-agents`). Availability is one choice question with a `not_stated` option. Only these labels can leave the classifier.

## Result: 22 October 2026, laya 0.4.13, 10 synthetic snippets

Not good enough to fill a brief without review.

| Checkpoint | Threshold | Precision | Recall |
|---|---|---|---|
| `english` | 0.5 | 0.33 | 0.73 |
| `english` | **0.7** (best) | 0.56 | 0.67 |
| `english` | 0.8 | 0.67 | 0.33 |
| `multilingual` | 0.5 | 0.28 | 0.53 |
| `multilingual` | 0.7 | 0.38 | 0.40 |

Pooled over all 160 label decisions (30 true). One question per call gives the same numbers as all questions in one call.

At `english` / 0.7, by field:

- **offers:** precision 0.67, recall 0.60.
- **seeks:** precision 0.33, recall 0.71. Often suggests skills the person never asked for.
- **interests:** precision 0.75, recall 0.69. Missed `travel` in the travel-engineer snippet.
- **availability:** 5/10. Usually says `full_time` when nothing is stated.
- **Negation:** "I'm not an engineer … want someone technical" lost the sought engineering. "Full-stack developer, never done sales" lost offered engineering.
- **Overall:** 1/10 snippets had every label right, and that one was the near-empty snippet.
- **Speed:** about 0.4 s per snippet on CPU after a one-time load (about 105 s including download, about 6 s from cache).

Confidence is uncalibrated: the checkpoint warns that some temperatures are invalid, and the Laya benchmarks say both checkpoints ship over-confident.

## What this means for the brief

- Treat any suggestion as `needs_review`, never `ready`, and never pre-publish.
- If used at all, show `english` / 0.7 suggestions for offers and interests only. Leave sought skills and availability for the founder to enter.
- The manual brief stays the main path. Say "suggested by a local classifier, check each one" on screen.
- Ten snippets is a smoke test, not an accuracy claim.

## Companion for the brief editor

```sh
HF_HUB_CACHE=.wyj-local/hf .wyj-local/venv/bin/python scripts/local-classifier/server.py
```

Each founder runs this on their own laptop. The browser calls it directly through `classifyLocally()` in `lib/private/classifier-contract.ts`, so profile text never reaches the shared Next server.

- **Address:** binds `127.0.0.1:11435` only.
- **Origin allowlist:** answers only origins listed in `WYJ_ORIGINS` (default `http://localhost:3000,http://localhost:3002`). A missing or other origin gets 403, and a Host other than 127.0.0.1 or localhost gets 421, which blocks DNS rebinding.
- **Logging:** no request lines, bodies or labels are logged.
- **Output:** `POST /classify {"text": "..."}` returns offered skills and interests only (`english`, threshold 0.7), always with status `needs_review`. Sought skills and availability are always empty or null for the founder to fill in.
- **When Laya isn't ready:** while loading, or if Laya can't load, the answer is `503` with status `unavailable`. If the companion isn't running at all, the browser adapter returns `unavailable` itself. There is no other model and no cloud fallback.
- **Status check:** `GET /health` returns `loading`, `ready` or `unavailable`.

Checked on 22 October 2026: loading 503, ready, 403 without or with a foreign Origin, 421 for a foreign Host, browser preflight answered (including private-network access), 400 on bad JSON, 503 `unavailable` without Laya installed, and no input text in the log. Calls from a page served over an HTTPS tunnel to this http loopback address have not been tested.


## Integration with the WYJ intake

The intake compatibility wrapper in `lib/private/local-classifier.ts` accepts `(profile, idea)` and passes a labeled combination to this companion using its `{text}` protocol. It never accepts the separate private conditions field. Both this wrapper and the teammate adapter refuse server-side execution; browser requests omit cookies and have no hosted fallback. Sought skills, availability, personal strengths and working style remain explicit founder choices rather than model suggestions.

The integration laptop starts the companion with `WYJ_ORIGINS=http://localhost:3002` and its existing Hugging Face cache, using the same downloaded English checkpoint. The ten-case evaluation and measured limitations above are preserved; the smaller earlier integration smoke is superseded by this teammate runtime. This is not a new accuracy claim.
