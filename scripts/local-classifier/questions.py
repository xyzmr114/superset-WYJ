"""Narrow Laya questions for the allowlisted brief labels, and reading the answers back.

Only these labels can leave the classifier. Unknown or unstated fields stay empty for the
founder to fill in.
"""

SKILLS = {
    "engineering": "software engineering or writing code",
    "sales": "sales, business development or go-to-market",
    "product": "product management, product strategy or customer research",
    "design": "product, UX or visual design",
    "data": "data science, machine learning or analytics",
}

INTERESTS = {
    "developer-tools": "tools for software developers or engineering workflows",
    "payments": "payments, billing or fintech",
    "healthcare": "healthcare, clinics or medical work",
    "climate": "climate, energy or sustainability",
    "travel": "travel, trips or booking",
    "ai-agents": "AI agents or infrastructure for agents",
}

AVAILABILITY = {
    "exploring": "only exploring ideas for now",
    "weekends": "available on weekends or part time",
    "full_time": "available or planning to go full time",
    "not_stated": "availability is not mentioned",
}


def build_questions():
    q = {}
    for label, desc in SKILLS.items():
        q[f"offers:{label}"] = {
            "type": "noul",
            "instructions": f"The person says they themselves have experience in {desc}.",
        }
        q[f"seeks:{label}"] = {
            "type": "noul",
            "instructions": f"The person says they are looking for a cofounder or partner with {desc}.",
        }
    for label, desc in INTERESTS.items():
        q[f"interests:{label}"] = {
            "type": "noul",
            "instructions": f"The person says they want to work on {desc}.",
        }
    q["availability"] = {
        "type": "choice",
        "instructions": "How much time does the person say they can commit?",
        "criteria": AVAILABILITY,
    }
    return q


def build_brief_questions():
    """Offered skills and interests only: the smoke test found sought skills and
    availability too unreliable to suggest, so the founder enters those."""
    return {k: v for k, v in build_questions().items() if k.startswith(("offers:", "interests:"))}


def read_answers(result, threshold):
    answers = result["answers"]
    out = {"offers": [], "seeks": [], "interests": [], "confidence": {}}
    for key, answer in answers.items():
        if key == "availability" or ":" not in key:
            continue
        kind, label = key.split(":", 1)
        p = float(answer["noul"])
        out["confidence"][key] = round(p, 3)
        if p >= threshold:
            out[kind].append(label)
    out["availability"] = answers["availability"]["choice"] if "availability" in answers else None
    return out
