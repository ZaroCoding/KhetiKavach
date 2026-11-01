"""Telegram Bot API (sendMessage). Free, instant, demoable on a judge's phone."""

from app.config import get_settings
from app.connectors.base import SourceUnavailable, client


async def send_message(chat_id: int, text: str) -> None:
    token = get_settings().telegram_bot_token
    if not token:
        raise SourceUnavailable("telegram", "TELEGRAM_BOT_TOKEN not set")
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
    resp.raise_for_status()
