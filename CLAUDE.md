# KhetKavach (FORGE hackathon build)

KhetKavach ("field shield") is an AI agent that watches a registered farm field from space and
from the ground, gives probabilities of a dry spell or damaging rain over the next 15 days, and
writes a cited, crop-stage-aware action plan before damage happens. Primary users are FPO
agronomists and KVK extension officers managing many fields; farmers receive Telegram alerts
(Hindi/regional language) and district agriculture officers see roll-ups.

Plan of record: `docs/STRATEGY.md`. Architecture: `docs/ARCHITECTURE.md`. API shapes: `docs/CONTRACTS.md`.

## Monorepo layout

```
apps/web    Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, MapLibre GL JS,
            Terra Draw, Recharts. Deployed on Vercel.
apps/api    Python 3.11, FastAPI, Pydantic v2, LangGraph, asyncpg (plain SQL at runtime),
            SQLAlchemy + Alembic for migrations only (ruling B-20). Docker (Cloud Run or Render).
            app/connectors  ALL external I/O lives here, including the LLM and Telegram SDK calls
            app/agent       LangGraph nodes and graph, tools, quality gates, trace, evidence
            app/risk        crop stages, ensemble counting, LightGBM model
            app/rag         scenarios, PDF text, embeddings, retriever, verifier, rule-based plan
            app/routers     REST + SSE routes; app/schemas.py mirrors docs/CONTRACTS.md
            alembic/        migrations; scripts/ data loaders, training, admin, edge-case drill
infra/      Dockerfiles, CI workflows, deploy config
data/       The two CRIDA plan PDFs and setup docs (data/README.md). Never hand-written values.
docs/       STRATEGY.md, ARCHITECTURE.md, CONTRACTS.md
```

Database: one PostgreSQL 16 with PostGIS + pgvector (Neon). No other datastore.

## Commands

API (run from `apps/api`):
- Install: `uv sync`
- Dev server: `uv run uvicorn app.main:app --reload`
- Test: `uv run pytest` (single: `uv run pytest tests/connectors/test_open_meteo.py -k name`)
- Lint + format: `uv run ruff check . && uv run ruff format --check .`
- Types: `uv run mypy app`
- Migrations: `uv run alembic upgrade head`; new: `uv run alembic revision -m "msg"` (write SQL by hand)
- Data: `uv run --group data python -m scripts.load_imd --district PB_LUDHIANA`,
  `uv run python -m scripts.ingest_crida --district PB_LUDHIANA` (`--dry-run` to preview),
  `uv run python -m scripts.train_dryspell`,
  `uv run python -m scripts.build_query_vectors` (the Docker build runs this; run it locally for
  vector retrieval in dev, otherwise retrieval uses full-text only)

Web (run from `apps/web`):
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Types: `pnpm typecheck` (`tsc --noEmit`)
- Build: `pnpm build`

Before saying work is done, run test + lint + types for every app you touched.

## HARD RULES (non-negotiable)

1. **No fixture or invented data anywhere, ever.** No JSON fixtures, seed rows with made-up
   numbers, hardcoded sample values, lorem-ipsum metrics, or "example" payloads that look real,
   in code, tests, docs, or UI. Every number comes from a live API, a live database, or an
   official open dataset. A database cache of real responses is allowed.
   - Tests for connectors may use recorded real responses only if captured from the real
     upstream, stored outside the app runtime path, and labelled with source and capture time.
     If unsure, ask first. Failure simulation (e.g. respx for timeouts/429s) is fine.
   - **Logic-test inputs are allowed**: small hand-built arrays/values in unit tests whose
     expected result is derivable by hand (e.g. 17 of 51 members dry -> 0.333), or a
     deliberately wrong number to prove the verifier rejects it. They live only under `tests/`,
     are named as test inputs, and must never reach app code, the DB, an API response, the UI,
     docs, or the demo.
   - If a source has no real value, return `unavailable`. Never fill a placeholder.
2. **Every number carries `source` + `fetched_at`** and a `status` (live | cached | archived |
   unavailable) from connector to DB to API response to UI. Drop nothing along the way.
3. **Every external call goes through `apps/api/app/connectors`** with: timeout (8 s weather,
   20 s imagery), one retry with backoff, a named fallback source, and a read-through cache in
   `api_cache` (key = source + request hash). Nothing else may import `httpx`/`requests`
   or a vendor SDK. The frontend never calls an external data source.
4. **Secrets only from environment variables.** Never commit `.env`; keep `.env.example` with
   names only. **API keys never reach the browser**: no `NEXT_PUBLIC_` secrets, no keys in
   responses, logs, or the trace.
5. The LLM writes wording only. Numbers come from deterministic tools; the verifier rejects any
   number or claim not present in tool outputs or retrieved passages.

## Code style

- Typed everywhere: Python fully annotated (mypy clean), Pydantic v2 models at every boundary,
  TypeScript `strict` with no `any`.
- Small modules, one responsibility each; connectors expose a typed function returning a model
  that includes provenance.
- pytest for **every connector and every agent node** (including fallback and failure paths).
- No `TODO`/`FIXME`/stub/`pass`/`NotImplementedError` in merged code. Unfinished work is not merged.
  **Only exception: scaffolding a runbook prompt explicitly asks for** (HTTP 501 routers with the
  documented response schema; agent nodes that raise `NotImplementedError` until their own
  prompt). These must fail loudly, never return fake data, be listed in the commit message, and
  be replaced by the prompt that implements them, before the H20 checkpoint.
- Structured JSON logs; never log secrets.
- Input validation returns HTTP 422 with a human-readable reason.

## Workflow

- **Plan first.** For anything beyond a trivial edit, state the plan and wait for agreement
  before writing code.
- **Run tests before saying done.** Report failures with their output; never claim a pass you
  did not run.
- **`docs/CONTRACTS.md` is the single source of truth for API shapes.** Change it first (or in
  the same change), then update Pydantic models and TypeScript types to match. Anything
  unspecified there is an OPEN QUESTION: ask, do not guess.
- Keep `docs/ARCHITECTURE.md` in sync with structural changes.
- Do not add auth/login to the demo path. Do not add a yield-in-t/ha regression. See
  "Features to avoid" in `docs/STRATEGY.md`.
