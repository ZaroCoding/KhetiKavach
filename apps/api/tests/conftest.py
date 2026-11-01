"""Tests never touch a real database or network: point the app at an unreachable database."""

import os
from collections.abc import Iterator

import pytest

os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/unreachable"
os.environ["ADMIN_KEY"] = "test-admin-key"


@pytest.fixture(autouse=True)
def fresh_llm_cooldowns() -> Iterator[None]:
    """A provider that failed in one test must not be skipped in the next."""
    from app.connectors import llm

    llm._skip_until.clear()
    yield
    llm._skip_until.clear()
