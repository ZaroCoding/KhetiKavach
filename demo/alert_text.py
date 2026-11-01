"""Writes demo/alert.json: the alert text the real formatter produces for this run's Hindi assessment.

Run from an apps/api directory with PYTHONPATH=. : python <path>/alert_text.py <repo> <api-url>
Also reports how many rows alerts_sent holds, because that table keeps only a hash of each message.
"""

import asyncio
import json
import sys
import urllib.request
from pathlib import Path

import asyncpg

from app.alerts.messages import format_alert
from app.config import get_settings

RANK = {"low": 0, "moderate": 1, "high": 2, "severe": 3}


async def main() -> None:
    repo, api = Path(sys.argv[1]), sys.argv[2]
    run = json.loads((repo / "demo/clips/run.json").read_text(encoding="utf-8"))
    aid = run["assessments"]["live_hi"]
    with urllib.request.urlopen(f"{api}/api/assessments/{aid}") as res:
        a = json.load(res)
    risk = max(a["risks"], key=lambda r: (RANK.get(r["severity"], -1), r.get("probability") or 0))
    text = format_alert(run["liveField"]["name"], risk, a["plan"], "hi")
    url = get_settings().database_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    sent = await conn.fetchval("SELECT count(*) FROM alerts_sent")
    await conn.close()
    out = {"text": text, "assessment_id": aid, "hazard": risk["hazard"], "alerts_sent_rows": sent}
    (repo / "demo/alert.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("alert.json written; alerts_sent rows:", sent)


asyncio.run(main())
