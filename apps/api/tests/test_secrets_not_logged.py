"""CLAUDE.md hard rule 4: a secret never reaches a log line, a response or an exception message.

The Telegram bot token is part of the request URL, which is where it used to leak: httpx logs the
URL at INFO, and its HTTPStatusError text contains it. TEST_TOKEN is a made-up test input.
"""

import logging
from collections.abc import Iterator

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app.config import get_settings
from app.connectors import telegram
from app.connectors.base import SourceUnavailable
from app.main import app, quiet_http_loggers

TEST_TOKEN = "123456789:TEST-token-not-a-real-credential"
SEND_URL = f"https://api.telegram.org/bot{TEST_TOKEN}/sendMessage"


@pytest.fixture(autouse=True)
def test_token(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", TEST_TOKEN)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@respx.mock
async def test_a_rejected_message_error_carries_status_and_reason_but_not_the_url() -> None:
    respx.post(SEND_URL).mock(
        return_value=httpx.Response(
            400, json={"ok": False, "description": "Bad Request: chat not found"}
        )
    )
    with pytest.raises(SourceUnavailable) as caught:
        await telegram.send_message(1, "hello")
    assert "HTTP 400" in caught.value.reason and "chat not found" in caught.value.reason
    assert TEST_TOKEN not in str(caught.value) and TEST_TOKEN not in repr(caught.value)
    assert caught.value.__cause__ is None and caught.value.__suppress_context__


@respx.mock
async def test_a_network_failure_error_does_not_carry_the_url() -> None:
    respx.post(SEND_URL).mock(side_effect=httpx.ConnectTimeout("timed out"))
    with pytest.raises(SourceUnavailable) as caught:
        await telegram.send_message(1, "hello")
    assert caught.value.reason == "request failed: ConnectTimeout"
    assert TEST_TOKEN not in str(caught.value)


@respx.mock
async def test_a_failed_send_leaves_no_token_in_the_logs(caplog: pytest.LogCaptureFixture) -> None:
    respx.post(SEND_URL).mock(
        return_value=httpx.Response(401, json={"description": "Unauthorized"})
    )
    quiet_http_loggers()  # what the app does at start-up
    with caplog.at_level(logging.INFO):
        with pytest.raises(SourceUnavailable) as caught:
            await telegram.send_message(1, "hello")
        logging.getLogger("ops").warning("telegram send failed: %s", caught.value)  # as ops.py does
    assert TEST_TOKEN not in caplog.text
    assert "telegram send failed: telegram: HTTP 401 Unauthorized" in caplog.text


def test_the_app_silences_httpx_request_lines_at_startup() -> None:
    with TestClient(app):
        assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING
        assert logging.getLogger("httpcore").getEffectiveLevel() >= logging.WARNING
