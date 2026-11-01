"""Deterministic plan verifier (CLAUDE.md hard rule 5). No LLM judges the LLM.

A drafted plan is rejected when:
  1. an action has no citation, or cites a chunk that was not retrieved;
  2. any number in its text is not found in the evidence/risks or in the passage that same action
     cites (Devanagari and Gurmukhi digits are normalised to ASCII first);
  3. its `when` date, or a date written in its text, falls outside the forecast window.
Returns a list of (item, reason) problems; an empty list means the plan passes.
"""

import re
from collections.abc import Iterable
from datetime import date, timedelta
from typing import Any

DIGITS = str.maketrans("०१२३४५६७८९੦੧੨੩੪੫੬੭੮੯", "01234567890123456789")
NUM_RE = re.compile(r"(?<![\w.])(\d+(?:[.,]\d+)?)")
DAY_WORDS = re.compile(
    r"^\s*(-|to|–)?\s*(\d+\s*)?(days?|din|दिन|ਦਿਨ|hours?|घंटे|weeks?|सप्ताह|ਹਫ਼ਤੇ)", re.I
)
MONTHS: dict[str, int] = {
    name: i
    for i, names in enumerate(
        [
            ("jan", "january", "जनवरी", "ਜਨਵਰੀ"),
            ("feb", "february", "फरवरी", "फ़रवरी", "ਫਰਵਰੀ"),
            ("mar", "march", "मार्च", "ਮਾਰਚ"),
            ("apr", "april", "अप्रैल", "ਅਪ੍ਰੈਲ"),
            ("may", "मई", "ਮਈ"),
            ("jun", "june", "जून", "ਜੂਨ"),
            ("jul", "july", "जुलाई", "ਜੁਲਾਈ"),
            ("aug", "august", "अगस्त", "ਅਗਸਤ"),
            ("sep", "sept", "september", "सितंबर", "सितम्बर", "ਸਤੰਬਰ"),
            ("oct", "october", "अक्टूबर", "ਅਕਤੂਬਰ"),
            ("nov", "november", "नवंबर", "नवम्बर", "ਨਵੰਬਰ"),
            ("dec", "december", "दिसंबर", "दिसम्बर", "ਦਸੰਬਰ"),
        ],
        1,
    )
    for name in names
}
_MON = "|".join(sorted(MONTHS, key=len, reverse=True))
DATE_ISO = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
DATE_DM = re.compile(rf"\b(\d{{1,2}})\s*({_MON})\.?(?:\s*,?\s*(\d{{4}}))?", re.I)
DATE_MD = re.compile(rf"\b({_MON})\.?\s*(\d{{1,2}})(?:\s*,?\s*(\d{{4}}))?", re.I)


def _flatten(obj: Any) -> Iterable[Any]:
    if isinstance(obj, dict):
        for v in obj.values():
            yield from _flatten(v)
    elif isinstance(obj, list | tuple):
        for v in obj:
            yield from _flatten(v)
    else:
        yield obj


def _variants(x: float) -> set[float]:
    out = {round(x, 2), round(x, 1), float(round(x))}
    if 0 <= x <= 1:
        out |= {round(x * 100, 1), float(round(x * 100))}
    return out


def numbers_in_text(text: str) -> list[tuple[float, int]]:
    """(value, end offset) of each number in already-normalised text."""
    out = []
    for m in NUM_RE.finditer(text):
        try:
            out.append((float(m.group(1).replace(",", ".")), m.end()))
        except ValueError:
            continue
    return out


def allowed_numbers(obj: Any) -> set[float]:
    allowed: set[float] = set()
    for v in _flatten(obj):
        if isinstance(v, bool):
            continue
        if isinstance(v, int | float):
            allowed |= _variants(float(v))
        elif isinstance(v, str):
            for x, _ in numbers_in_text(v.translate(DIGITS)):
                allowed |= _variants(x)
    return allowed


def strip_dates(text: str, as_of: date, horizon_days: int = 16) -> tuple[str, list[str]]:
    """Remove dates inside [as_of - 1, as_of + horizon] from the text; report dates outside it."""
    problems: list[str] = []
    lo, hi = as_of - timedelta(days=1), as_of + timedelta(days=horizon_days)

    def check(m: re.Match[str], y: str | None, mo: int | str, d: str) -> str:
        try:
            year = int(y) if y else as_of.year + (1 if int(mo) < as_of.month - 6 else 0)
            when = date(year, int(mo), int(d))
        except ValueError:
            return m.group(0)
        if not lo <= when <= hi:
            problems.append(f"date {m.group(0).strip()} is outside the forecast window")
        return " "

    text = DATE_ISO.sub(lambda m: check(m, m.group(1), m.group(2), m.group(3)), text)
    text = DATE_DM.sub(lambda m: check(m, m.group(3), MONTHS[m.group(2).lower()], m.group(1)), text)
    text = DATE_MD.sub(lambda m: check(m, m.group(3), MONTHS[m.group(1).lower()], m.group(2)), text)
    return text, problems


def verify_plan(
    actions: list[dict[str, Any]],
    evidence: Any,
    passages: dict[str, str],
    as_of: date,
    horizon_days: int = 15,
) -> list[tuple[str, str]]:
    if not actions:
        return [("plan", "plan has no actions")]
    problems: list[tuple[str, str]] = []
    base = allowed_numbers(evidence)
    for i, action in enumerate(actions, 1):
        item = f"action {i}"
        cid = str(action.get("citation_id") or "")
        if not cid:
            problems.append((item, "no citation"))
        elif cid not in passages:
            problems.append((item, f"cites chunk {cid} that was not retrieved"))
        when = action.get("when")
        if isinstance(when, date) and not as_of <= when <= as_of + timedelta(days=horizon_days):
            problems.append((item, f"date {when} is outside the forecast window"))
        allowed = base | allowed_numbers(passages.get(cid, ""))
        raw = str(action.get("text", "")).translate(DIGITS)
        text, date_problems = strip_dates(raw, as_of)
        problems += [(item, p) for p in date_problems]
        for x, end in numbers_in_text(text):
            if x in allowed or round(x, 1) in allowed or round(x, 2) in allowed:
                continue
            if x <= 15 and float(x).is_integer() and DAY_WORDS.match(text[end : end + 24]):
                continue  # "within 3 days" style timing inside the horizon
            problems.append((item, f"number {x:g} is not in the evidence or the cited passage"))
    return problems
