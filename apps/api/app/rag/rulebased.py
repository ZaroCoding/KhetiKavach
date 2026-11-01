"""Rule-based plan: used when the LLM is unavailable or fails verification three times.

Quotes action sentences straight from the retrieved CRIDA passages, so it cannot invent anything
and always passes the verifier. Language stays the plan's own (English).
"""

import re
from datetime import date
from typing import Any

ACTION_HINT = re.compile(
    r"\b(sow|re-?sow|transplant|apply|spray|irrigat|harvest|drain|mulch|thin|weed|intercult|"
    r"conserv|store|cover|delay|postpone|avoid|use|adopt|grow|prefer|select|top\s*dress|ridge|"
    r"furrow|withhold)",
    re.I,
)
SPLIT = re.compile(r"(?:\n|•|●|▪|;|(?<=\.)\s+|\s\d+\)\s|\s[a-z]\)\s)")


def action_sentences(text: str) -> list[str]:
    parts = [re.sub(r"\s+", " ", p).strip(" -–:.") for p in SPLIT.split(text)]
    return [p for p in parts if 25 <= len(p) <= 240 and ACTION_HINT.search(p)]


def build(passages: list[dict[str, Any]], when: date, max_actions: int = 4) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    seen: set[str] = set()
    for p in passages:
        for sentence in action_sentences(str(p["text"])):
            key = sentence.lower()[:60]
            if key in seen:
                continue
            seen.add(key)
            actions.append(
                {"text": sentence, "when": when, "citation_id": str(p["id"]), "numbers_used": []}
            )
            if len(actions) >= max_actions:
                return actions
    return actions
