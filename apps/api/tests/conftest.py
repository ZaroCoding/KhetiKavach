"""Tests never touch a real database or network: point the app at an unreachable database."""

import os

os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/unreachable"
os.environ["ADMIN_KEY"] = "test-admin-key"
