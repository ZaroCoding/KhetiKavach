"""Admin kill switch, monitoring job, sensor ingest and the Telegram webhook (CONTRACTS.md)."""

import hashlib
import hmac
import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, Request

from app import db
from app.agent.graph import run_assessment
from app.alerts import messages
from app.config import get_settings
from app.connectors.telegram import send_message
from app.errors import ApiError
from app.ratelimit import rate_limit
from app.routers.assessments import create_assessment_row, load_field
from app.schemas import SOURCE_NAMES, AdminSource, MonitorRequest, MonitorResult, SensorReading

router = APIRouter(prefix="/api")
log = logging.getLogger("ops")
admin_limit = rate_limit(30)  # slows guessing of X-Admin-Key (ruling B-22)
SEVERITY_RANK = {"unknown": -1, "low": 0, "moderate": 1, "high": 2, "severe": 3}


def require_admin(key: str | None) -> None:
    expected = get_settings().admin_key
    if not expected or not key or not hmac.compare_digest(key, expected):
        raise ApiError(401, "missing or wrong X-Admin-Key")


# ---------------------------------------------------------------- admin
async def _source_item(source: str) -> AdminSource:
    row = await db.pool().fetchrow(
        "SELECT disabled, updated_at FROM source_switches WHERE source = $1", source
    )
    return AdminSource(
        source=source,
        disabled=bool(row and row["disabled"]),
        updated_at=row["updated_at"] if row else None,
    )


@router.get("/admin/sources", response_model=list[AdminSource], dependencies=[Depends(admin_limit)])
async def admin_sources(x_admin_key: str | None = Header(default=None)) -> list[AdminSource]:
    require_admin(x_admin_key)
    return [await _source_item(s) for s in SOURCE_NAMES]


async def _switch(source: str, disabled: bool, key: str | None) -> AdminSource:
    require_admin(key)
    if source not in SOURCE_NAMES:
        raise ApiError(404, f"unknown source {source}")
    await db.pool().execute(
        """INSERT INTO source_switches(source, disabled, updated_at) VALUES ($1, $2, now())
           ON CONFLICT (source) DO UPDATE SET disabled = $2, updated_at = now()""",
        source,
        disabled,
    )
    return await _source_item(source)


@router.post(
    "/admin/sources/{source}/disable",
    response_model=AdminSource,
    dependencies=[Depends(admin_limit)],
)
async def disable(source: str, x_admin_key: str | None = Header(default=None)) -> AdminSource:
    return await _switch(source, True, x_admin_key)


@router.post(
    "/admin/sources/{source}/enable",
    response_model=AdminSource,
    dependencies=[Depends(admin_limit)],
)
async def enable(source: str, x_admin_key: str | None = Header(default=None)) -> AdminSource:
    return await _switch(source, False, x_admin_key)


# ---------------------------------------------------------------- monitoring
def alert_due(
    risks: list[dict[str, Any]], previous: list[dict[str, Any]], threshold: float
) -> list[dict[str, Any]]:
    """Hazards needing an alert: probability >= threshold, or severity up a band since last run."""
    before = {r["hazard"]: SEVERITY_RANK.get(r["severity"], -1) for r in previous}
    due = []
    for r in risks:
        p = r.get("probability")
        rose = SEVERITY_RANK.get(r["severity"], -1) > before.get(r["hazard"], 99)
        if (p is not None and p >= threshold) or rose:
            due.append(r)
    return due


@router.post("/jobs/monitor", response_model=MonitorResult, dependencies=[Depends(admin_limit)])
async def monitor(
    body: MonitorRequest | None = None, x_admin_key: str | None = Header(default=None)
) -> MonitorResult:
    require_admin(x_admin_key)
    return await run_monitor(body.field_ids if body else None)


async def run_monitor(field_ids: list[str] | None = None) -> MonitorResult:
    rows = await db.pool().fetch(
        """SELECT DISTINCT field_id::text AS field_id FROM alert_subscriptions WHERE active
           AND ($1::uuid[] IS NULL OR field_id = ANY($1::uuid[]))""",
        field_ids,
    )
    result = MonitorResult(checked=0, alerted=0, skipped=0, errors=0)
    for row in rows:
        field = await load_field(row["field_id"])
        if field is None:
            continue
        previous = (
            await db.pool().fetchval(
                """SELECT risks FROM assessments WHERE field_id = $1::uuid AND as_of IS NULL
               AND status IN ('completed', 'completed_degraded')
               ORDER BY completed_at DESC LIMIT 1""",
                field["id"],
            )
            or []
        )
        aid = await create_assessment_row(field["id"], None, "en")
        out = await run_assessment(aid, field, None, "en")
        result.checked += 1
        if out.get("status") == "failed":
            result.errors += 1
            continue
        card = await db.pool().fetchrow(
            "SELECT risks, plan FROM assessments WHERE id = $1::uuid", aid
        )
        due = alert_due(card["risks"] or [], previous, get_settings().alert_probability)
        if not due:
            result.skipped += 1
            continue
        subs = await db.pool().fetch(
            """SELECT id, telegram_chat_id, language FROM alert_subscriptions
               WHERE field_id = $1::uuid AND active""",
            field["id"],
        )
        for sub in subs:
            for risk in due:
                recent = await db.pool().fetchval(
                    """SELECT 1 FROM alerts_sent WHERE subscription_id = $1 AND hazard = $2
                       AND severity = $3 AND status = 'sent'
                       AND sent_at > now() - interval '24 hours'""",
                    sub["id"],
                    risk["hazard"],
                    risk["severity"],
                )
                if recent:
                    continue
                text = messages.format_alert(
                    field["name"], risk, card["plan"] or [], sub["language"]
                )
                status = "sent"
                try:
                    await send_message(int(sub["telegram_chat_id"]), text)
                    result.alerted += 1
                except Exception as exc:
                    log.warning("telegram send failed: %s", exc)
                    status = "failed"
                    result.errors += 1
                await db.pool().execute(
                    """INSERT INTO alerts_sent(subscription_id, assessment_id, hazard, severity,
                         message_hash, status) VALUES ($1, $2::uuid, $3, $4, $5, $6)""",
                    sub["id"],
                    aid,
                    risk["hazard"],
                    risk["severity"],
                    hashlib.sha256(text.encode()).hexdigest(),
                    status,
                )
    return result


# ---------------------------------------------------------------- sensors
@router.post("/sensors/ingest", status_code=202)
async def ingest(
    body: SensorReading, x_device_key: str | None = Header(default=None)
) -> dict[str, bool]:
    row = await db.pool().fetchrow(
        "SELECT key_hash, field_id FROM sensor_devices WHERE device_id = $1", body.device_id
    )
    digest = hashlib.sha256((x_device_key or "").encode()).hexdigest()
    if not row or not hmac.compare_digest(str(row["key_hash"]), digest):
        raise ApiError(401, "unknown device or wrong X-Device-Key")
    await db.pool().execute(
        """INSERT INTO sensor_readings(device_id, field_id, ts, soil_moisture_pct, temp_c, rh_pct)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        body.device_id,
        row["field_id"],
        body.ts,
        body.soil_moisture_pct,
        body.temp_c,
        body.rh_pct,
    )
    return {"received": True}


# ---------------------------------------------------------------- telegram
@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request, x_telegram_bot_api_secret_token: str | None = Header(default=None)
) -> dict[str, bool]:
    secret = get_settings().telegram_webhook_secret
    if not secret or not hmac.compare_digest(x_telegram_bot_api_secret_token or "", secret):
        raise ApiError(401, "wrong Telegram secret token")
    update = await request.json()
    msg = update.get("message") or {}
    text = str(msg.get("text") or "").strip()
    chat = (msg.get("chat") or {}).get("id")
    if not chat or not text.startswith("/start"):
        return {"ok": True}
    parts = text.split()
    try:
        if len(parts) < 2:
            await send_message(chat, messages.USAGE)
            return {"ok": True}
        lang = parts[2] if len(parts) > 2 and parts[2] in ("en", "hi", "pa") else "en"
        field = await db.pool().fetchrow(
            "SELECT id, COALESCE(name, short_code) AS name FROM fields WHERE short_code = $1",
            parts[1].upper(),
        )
        if not field:
            await send_message(chat, messages.NOT_FOUND)
            return {"ok": True}
        await db.pool().execute(
            """INSERT INTO alert_subscriptions(field_id, telegram_chat_id, language)
               VALUES ($1, $2, $3)
               ON CONFLICT (field_id, telegram_chat_id)
               DO UPDATE SET language = $3, active = true""",
            field["id"],
            chat,
            lang,
        )
        await send_message(chat, messages.SUBSCRIBED.format(name=field["name"]))
    except Exception as exc:
        log.warning("telegram webhook processing failed: %s", exc)
    return {"ok": True}
