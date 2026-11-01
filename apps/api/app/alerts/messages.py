"""Alert and bot reply texts (ruling B-9). Numbers come straight from the assessment."""

import html
from typing import Any

HAZARD = {
    "en": {"dry_spell": "Dry spell", "heavy_rain": "Heavy rain", "harvest_rain": "Rain at harvest"},
    "hi": {"dry_spell": "सूखा अंतराल", "heavy_rain": "भारी बारिश", "harvest_rain": "कटाई पर बारिश"},
    "pa": {"dry_spell": "ਸੋਕੇ ਦਾ ਦੌਰ", "heavy_rain": "ਭਾਰੀ ਮੀਂਹ", "harvest_rain": "ਵਾਢੀ ਸਮੇਂ ਮੀਂਹ"},
}
SEVERITY = {
    "en": {
        "low": "low",
        "moderate": "moderate",
        "high": "HIGH",
        "severe": "SEVERE",
        "unknown": "unknown",
    },
    "hi": {"low": "कम", "moderate": "मध्यम", "high": "उच्च", "severe": "गंभीर", "unknown": "अज्ञात"},
    "pa": {"low": "ਘੱਟ", "moderate": "ਦਰਮਿਆਨਾ", "high": "ਉੱਚ", "severe": "ਗੰਭੀਰ", "unknown": "ਅਣਜਾਣ"},
}
HEAD = {"en": "KhetKavach alert", "hi": "खेतकवच चेतावनी", "pa": "ਖੇਤਕਵਚ ਚੇਤਾਵਨੀ"}
CHANCE = {"en": "chance", "hi": "संभावना", "pa": "ਸੰਭਾਵਨਾ"}

SUBSCRIBED = "Subscribed to alerts for <b>{name}</b>.\nइस खेत के लिए चेतावनी चालू हो गई है।"
NOT_FOUND = "Field code not found.\nखेत कोड नहीं मिला।"
USAGE = (
    "Send /start FIELD-CODE (shown on the field card) to receive alerts.\n"
    "चेतावनी पाने के लिए /start और खेत कोड भेजें।"
)


def format_alert(
    field_name: str, risk: dict[str, Any], plan: list[dict[str, Any]], language: str
) -> str:
    lang = language if language in HEAD else "en"
    p = risk.get("probability")
    prob = f"{round(p * 100)}%" if p is not None else "?"
    window = risk.get("window") or {}
    lines = [
        f"<b>{HEAD[lang]}: {html.escape(field_name)}</b>",
        f"{HAZARD[lang][risk['hazard']]}: {SEVERITY[lang][risk['severity']]} "
        f"({prob} {CHANCE[lang]}),"
        f" {window.get('start', '')} – {window.get('end', '')}",
    ]
    for action in plan[:3]:
        lines.append(f"• {html.escape(action['text'])} ({action['when']})")
    if plan:
        c = plan[0]["citation"]
        lines.append(f"<i>{html.escape(c['doc_title'])} ({c['plan_year']}), p.{c['page']}</i>")
    return "\n".join(lines)
