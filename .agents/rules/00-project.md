---
trigger: always_on
---
# KhetKavach workspace rules (Antigravity)

CLAUDE.md at the repo root is the rule book; follow every HARD RULE in it. In short:
- docs/CONTRACTS.md (FROZEN, rulings B-1..B-21) is the single source of truth for API shapes.
  Change it first, then apps/api/app/schemas.py and apps/web/lib/types.ts together.
- No fixture or invented data, ever. A failed source returns "unavailable", never a placeholder.
- Every external call goes through apps/api/app/connectors (fetch_json / fetch_computed).
- Every number carries source, fetched_at and status from connector to UI.
- The LLM writes wording only; numbers come from code; the deterministic verifier checks them.
- Secrets only from env; nothing secret reaches the browser.

Working style:
1. Produce an Implementation Plan artifact and wait for approval before multi-file edits.
2. Stay inside the module you were asked to change.
3. Run the checks before saying done: `uv run ruff check . && uv run ruff format --check . &&
   uv run mypy app && uv run pytest` in apps/api; `pnpm lint && pnpm typecheck && pnpm test &&
   pnpm build` in apps/web. Paste the output.
4. End with a Walkthrough: what changed, how to run it, three judge questions with answers.
