"""POST /api/telegram/webhook. Stub: checks the secret token and body, then returns 501."""

from fastapi import APIRouter, Depends

from app.errors import error_responses, not_implemented
from app.schemas.misc import OkResponse, TelegramUpdate
from app.security import require_telegram_secret

router = APIRouter(prefix="/api", tags=["telegram"])


@router.post(
    "/telegram/webhook",
    response_model=OkResponse,
    responses=error_responses(401, 422, 501),
    dependencies=[Depends(require_telegram_secret)],
    summary="Telegram Bot API webhook (/start <short_code> subscribes a chat)",
)
def telegram_webhook(update: TelegramUpdate) -> OkResponse:
    not_implemented("POST /api/telegram/webhook")
