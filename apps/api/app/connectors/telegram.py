"""Telegram Bot API (sendMessage). Free, instant, demoable on a judge's phone.

The bot token is part of the request URL, so no error from here may carry that URL: httpx puts it
in exception text, and callers log exceptions. Failures are re-raised as SourceUnavailable with
the HTTP status and Telegram's own description only (CLAUDE.md hard rule 4).
"""

import httpx

from app.config import get_settings
from app.connectors.base import SourceUnavailable, client


async def send_message(chat_id: int, text: str) -> None:
    token = get_settings().telegram_bot_token
    if not token:
        raise SourceUnavailable("telegram", "TELEGRAM_BOT_TOKEN not set")
    try:
        resp = await client().post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            timeout=10,
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
        )
    except httpx.HTTPError as exc:
        raise SourceUnavailable("telegram", f"request failed: {type(exc).__name__}") from None
    if resp.is_error:
        try:
            description = str(resp.json().get("description", ""))[:200]
        except ValueError:
            description = ""
        raise SourceUnavailable(
            "telegram", f"HTTP {resp.status_code} {description}".strip()
        ) from None
