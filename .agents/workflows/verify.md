---
description: Run every check CI runs and summarise failures
---
1. In apps/api: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app`, `uv run pytest`.
2. In apps/web: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (NEXT_PUBLIC_API_URL set).
3. If DATABASE_URL points at a local Postgres: `uv run alembic upgrade head`, `downgrade base`, `upgrade head`.
4. Report a table: check, pass/fail, first error line. Propose fixes; do not apply without approval.
