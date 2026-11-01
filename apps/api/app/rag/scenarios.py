"""Map risk outputs to ICAR-CRIDA District Agriculture Contingency Plan scenarios.

CRIDA plans are organised by weather scenario. Section headings vary slightly between districts, so
ingestion matches them by keyword (see HEADING_PATTERNS) and stores the canonical scenario key.
"""

import re

SCENARIOS = {
    "early_drought": "Early season drought (delayed onset of monsoon)",
    "early_dry_spell": "Normal onset followed by 15-20 days dry spell after sowing",
    "mid_drought": "Mid season drought (long dry spell, >2 weeks rainless period)",
    "terminal_drought": "Terminal drought (early withdrawal of monsoon)",
    "excess_rain": "Excess rainfall / heavy rainfall / floods",
    "unseasonal_rain": "Unusual / unseasonal rains, heavy rain with high wind in a short span",
    "heat_cold_hail": "Heat wave / cold wave / frost / hailstorm",
    "pest_disease": "Pest and disease outbreak due to weather",
    "general": "General / not scenario specific",
}

# Order matters: first match wins.
HEADING_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("early_drought", re.compile(r"early\s+season\s+drought|delayed\s+onset", re.I)),
    (
        "early_dry_spell",
        re.compile(r"normal\s+onset\s+followed|15\s*-?\s*20\s+days?\s+dry\s+spell", re.I),
    ),
    ("mid_drought", re.compile(r"mid[\s-]*season\s+drought|long\s+dry\s+spell", re.I)),
    ("terminal_drought", re.compile(r"terminal\s+drought|early\s+withdrawal", re.I)),
    (
        "unseasonal_rain",
        re.compile(r"un(usual|seasonal|timely)\s+rain|high\s+speed\s+winds?|untimely", re.I),
    ),
    (
        "excess_rain",
        re.compile(r"excess\s+rain|heavy\s+rain|flood|water\s*logging|inundation", re.I),
    ),
    ("heat_cold_hail", re.compile(r"heat\s+wave|cold\s+wave|frost|hail", re.I)),
    ("pest_disease", re.compile(r"pest|disease|outbreak", re.I)),
]


def scenario_for_heading(text: str) -> str | None:
    """Scenario named anywhere in `text` (used for short headings already isolated)."""
    for key, pat in HEADING_PATTERNS:
        if pat.search(text):
            return key
    return None


def heading_scenario(line: str) -> str | None:
    """Scenario if `line` looks like a section heading.

    A heading is short, starts with a capital letter or a section number, and has the scenario
    phrase at its start (body sentences mention floods too)."""
    stripped = line.strip()
    if not stripped or len(stripped) > 120 or not (stripped[0].isupper() or stripped[0].isdigit()):
        return None
    body = re.sub(r"^\d+(\.\d+)*\s*", "", stripped)
    for key, pat in HEADING_PATTERNS:
        m = pat.search(body)
        if m and m.start() <= 2:
            return key
    return None


def scenarios_for_risk(risk_key: str, stage: str, days_after_sowing: int) -> list[str]:
    """Which plan sections answer this risk at this stage. First entry is preferred."""
    if risk_key == "dry_spell":
        if days_after_sowing < 30:
            return ["early_dry_spell", "early_drought", "mid_drought"]
        if stage in ("yield_formation", "ripening"):
            return ["terminal_drought", "mid_drought", "early_drought"]
        return ["mid_drought", "early_dry_spell", "early_drought", "terminal_drought"]
    if risk_key == "harvest_rain":
        return ["unseasonal_rain", "excess_rain"]
    if risk_key == "heavy_rain":
        return ["excess_rain", "unseasonal_rain"]
    return ["general"]


NON_CROP_SECTION = re.compile(
    r"^\d+(\.\d+)*\s*Contingent strategies for (Livestock|Poultry|Fisher)", re.I
)
