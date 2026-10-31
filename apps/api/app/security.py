"""Client-supplied credentials (CONTRACTS.md, Credentials). Provider keys are never accepted here.

- X-Admin-Key: admin and job endpoints. Compared with the ADMIN_KEY setting; empty setting = reject.
- X-Device-Key: sensor ingest. Verified by SHA-256 lookup in sensor_devices once that
  implementation lands; the scaffold only requires the header to be present.
- X-Telegram-Bot-Api-Secret-Token: Telegram webhook, compared with TELEGRAM_WEBHOOK_SECRET.
"""

import hmac
from typing import Annotated

from fastapi import Header

from app.config import get_settings
from app.errors import ApiError


def _matches(supplied: str | None, expected: str) -> bool:
    if not expected or supplied is None:
        return False
    return hmac.compare_digest(supplied.encode("utf-8"), expected.encode("utf-8"))


def require_admin_key(
    x_admin_key: Annotated[str | None, Header(alias="X-Admin-Key")] = None,
) -> None:
    if not _matches(x_admin_key, get_settings().admin_key):
        raise ApiError(401, "UNAUTHORIZED", "missing or invalid X-Admin-Key")


def require_device_key(
    x_device_key: Annotated[str | None, Header(alias="X-Device-Key")] = None,
) -> None:
    if not x_device_key:
        raise ApiError(401, "UNAUTHORIZED", "missing X-Device-Key")


def require_telegram_secret(
    x_telegram_secret: Annotated[
        str | None, Header(alias="X-Telegram-Bot-Api-Secret-Token")
    ] = None,
) -> None:
    if not _matches(x_telegram_secret, get_settings().telegram_webhook_secret):
        raise ApiError(401, "UNAUTHORIZED", "missing or invalid Telegram secret token")
