"""Laya checkpoint smoke test over synthetic labeled snippets.

    HF_HUB_CACHE=.wyj-local/hf .wyj-local/venv/bin/python scripts/local-classifier/smoke.py [--model english]

Prints per-label results by case id only. Never prints snippet text.
"""
import argparse
import json
import time
from pathlib import Path

from laya import Router

from questions import AVAILABILITY, INTERESTS, SKILLS, build_questions, read_answers

HERE = Path(__file__).parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="english")
    parser.add_argument("--threshold", type=float, default=0.7)
    args = parser.parse_args()

    cases = json.loads((HERE / "cases.json").read_text())["cases"]
    router = Router()
    questions = build_questions()

    t0 = time.perf_counter()
    router.predict(cases[0]["text"], questions, model=args.model)  # warm-up, includes load
    load_s = time.perf_counter() - t0

    counts = {k: {"tp": 0, "fp": 0, "fn": 0} for k in ("offers", "seeks", "interests")}
    avail_ok = exact = 0
    latencies = []
    for case in cases:
        t = time.perf_counter()
        raw = router.predict(case["text"], questions, model=args.model)
        latencies.append(time.perf_counter() - t)
        got = read_answers(raw, args.threshold)
        ok = True
        line = [case["id"]]
        for kind in counts:
            want, have = set(case[kind]), set(got[kind])
            counts[kind]["tp"] += len(want & have)
            counts[kind]["fp"] += len(have - want)
            counts[kind]["fn"] += len(want - have)
            if want != have:
                ok = False
                line.append(f"{kind}: +{sorted(have - want)} -{sorted(want - have)}")
        if got["availability"] == case["availability"]:
            avail_ok += 1
        else:
            line.append(f"availability: {got['availability']} (want {case['availability']})")
        exact += ok
        print(" | ".join(line) if len(line) > 1 else f"{case['id']} | all labels correct")

    print()
    print(f"model={args.model} threshold={args.threshold} cases={len(cases)}")
    print(f"first call incl. load: {load_s:.1f}s; median per case: {sorted(latencies)[len(latencies) // 2]:.2f}s")
    for kind, c in counts.items():
        p = c["tp"] / (c["tp"] + c["fp"]) if c["tp"] + c["fp"] else 0.0
        r = c["tp"] / (c["tp"] + c["fn"]) if c["tp"] + c["fn"] else 0.0
        print(f"{kind:9s} precision {p:.2f} recall {r:.2f} (tp {c['tp']} fp {c['fp']} fn {c['fn']})")
    print(f"availability correct {avail_ok}/{len(cases)}")
    print(f"cases with offers/seeks/interests all correct: {exact}/{len(cases)}")
    print(f"labels: skills={list(SKILLS)} interests={list(INTERESTS)} availability={list(AVAILABILITY)}")


if __name__ == "__main__":
    main()
