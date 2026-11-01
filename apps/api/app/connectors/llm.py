"""LLM drafting connector: Gemini first, Groq as backup (both through fetch_computed, so they get
the same cache, timeout, retry, kill switch and health bookkeeping as every other source).

The LLM never computes or fetches a number: it words actions from retrieved passages and copies
numbers from the evidence block. The deterministic verifier checks what it wrote.
"""

import hashlib
import json
from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from app.config import get_settings
from app.connectors.base import SourceUnavailable, client, fetch_computed

LANG_NAMES = {"en": "English", "hi": "Hindi (Devanagari script)", "pa": "Punjabi (Gurmukhi script)"}


class DraftAction(BaseModel):
    text: str = Field(description="One concrete farm operation and why, <= 40 words")
    when: date = Field(description="Date to act, inside the forecast window (YYYY-MM-DD)")
    citation_id: str = Field(description="id of the PASSAGE this action comes from")
    numbers_used: list[float] = Field(
        default_factory=list, description="every number written in text, as numbers"
    )


class DraftPlan(BaseModel):
    summary: str = Field(description="Two sentences for the agronomist: main risk and what to do")
    actions: list[DraftAction]


SYSTEM = """You are an agronomy assistant for an Indian FPO agronomist.
Write a short action plan for ONE field from the EVIDENCE and the official district contingency-plan
PASSAGES. A verifier rejects the plan if any rule is broken:
1. Every action comes from a PASSAGE and gives that passage id as citation_id.
2. Every number you write appears in EVIDENCE or in the passage you cite. Never compute, convert or
   round to new numbers.
3. Every `when` date lies inside the forecast window given in EVIDENCE.
4. Do not invent varieties, chemicals, doses or prices that the cited passage does not contain.
5. 2 to 5 actions, most urgent first, fitting the crop's current stage.
6. Write `summary` and each `text` in {language}. Keep numbers as digits.
7. If every risk is low, say so and give only low-cost precautions."""


def build_prompt(
    field: dict[str, Any],
    risks: list[dict[str, Any]],
    evidence: dict[str, Any],
    passages: list[dict[str, Any]],
    feedback: list[str] | None,
) -> str:
    blocks = "\n\n".join(
        f"[id={p['id']}] ({p['doc_title']} {p.get('plan_year') or ''}, p.{p['page']}, "
        f"scenario={p['scenario']})\n{str(p['text'])[:1500]}"
        for p in passages
    )
    fb = ""
    if feedback:
        fb = (
            "\n\nYOUR PREVIOUS DRAFT WAS REJECTED BY THE VERIFIER:\n- "
            + "\n- ".join(feedback)
            + "\nFix every problem. Remove any number you cannot find verbatim."
        )
    return (
        f"FIELD: crop={field['crop']}, sowing_date={field['sowing_date']}, "
        f"district={field['district_code']}\n\n"
        f"EVIDENCE (risks):\n{json.dumps(risks, ensure_ascii=False, default=str)}\n\n"
        f"EVIDENCE (observations):\n{json.dumps(evidence, ensure_ascii=False, default=str)}"
        f"\n\nPASSAGES:\n{blocks}{fb}"
    )


async def _gemini(system: str, prompt: str) -> dict[str, Any]:
    from google import genai
    from google.genai import types

    s = get_settings()
    if not s.gemini_api_key:
        raise SourceUnavailable("gemini", "GEMINI_API_KEY not set")
    c = genai.Client(api_key=s.gemini_api_key)
    resp = await c.aio.models.generate_content(
        model=s.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=DraftPlan,
        ),
    )
    plan = (
        resp.parsed
        if isinstance(resp.parsed, DraftPlan)
        else DraftPlan.model_validate_json(resp.text or "{}")
    )
    return plan.model_dump(mode="json")


async def _groq(system: str, prompt: str) -> dict[str, Any]:
    s = get_settings()
    if not s.groq_api_key:
        raise SourceUnavailable("groq", "GROQ_API_KEY not set")
    schema = json.dumps(DraftPlan.model_json_schema())
    resp = await client().post(
        "https://api.groq.com/openai/v1/chat/completions",
        timeout=30,
        headers={"Authorization": f"Bearer {s.groq_api_key}"},
        json={
            "model": s.groq_model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": f"{system}\nReturn JSON matching: {schema}"},
                {"role": "user", "content": prompt},
            ],
        },
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return DraftPlan.model_validate_json(content).model_dump(mode="json")


async def draft_plan(
    field: dict[str, Any],
    risks: list[dict[str, Any]],
    evidence: dict[str, Any],
    passages: list[dict[str, Any]],
    language: str,
    feedback: list[str] | None = None,
) -> tuple[DraftPlan, str]:
    """Returns (plan, provider). Raises SourceUnavailable when every provider fails."""
    system = SYSTEM.format(language=LANG_NAMES.get(language, "English"))
    prompt = build_prompt(field, risks, evidence, passages, feedback)
    digest = hashlib.sha256((system + prompt).encode()).hexdigest()
    errors: list[str] = []
    # One attempt each: the other provider is the retry. Gemini's Flash alias was measured at
    # 70-160 s under load (2026-11-01) while Groq answered in 4 s: Gemini gets the shorter budget.
    budget = {"gemini": 25.0, "groq": 30.0}
    for source, fn in (("gemini", _gemini), ("groq", _groq)):

        async def call(fn: Any = fn) -> dict[str, Any]:
            result: dict[str, Any] = await fn(system, prompt)
            return result

        try:
            res = await fetch_computed(
                source,
                {"prompt_sha256": digest},
                call,
                ttl_s=6 * 3600,
                timeout_s=budget[source],
                request_url=f"{source}:generateContent",
                attempts=1,
            )
            return DraftPlan.model_validate(res.data), source
        except SourceUnavailable as exc:
            errors.append(f"{source}: {exc.reason}")
    raise SourceUnavailable("gemini", "; ".join(errors))
