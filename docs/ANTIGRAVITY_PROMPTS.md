# Antigravity prompts for this repo

The code for every P0 and most P1 features is now in the repo and passes CI-equivalent checks
(API: 31 tests, ruff, strict mypy; web: lint, typecheck, 8 tests, build; migrations up/down/up).
It has **not yet run against the live data sources** (the build sandbox blocked them). So these
prompts are for **verifying against real data, fixing what breaks, finishing, and learning the
code** — not for writing it from scratch.

> Rule check: the hackathon says core logic must be written inside the build window. Ask the
> organisers whether this pre-built code may be used. If not, use each prompt's "rebuild" variant:
> it tells Antigravity to rebuild the module from docs/CONTRACTS.md, comparing with the existing
> file instead of copying it.

## Set-up (once per laptop)
1. Open the repo root as the Antigravity workspace. `.agents/rules/` loads automatically
   (project rules point at CLAUDE.md; glob rules for `apps/api/**` and `apps/web/**`).
2. Use Planning mode with "Request review" for implementation plans. Read every plan.
3. One owner, one branch per task (`git switch -c fix/satellite-live`). Merge after `/verify`.
4. After each task the owner runs `/explain-module` on what changed (code-ownership rule).

Owners: **M1** web · **M2** API, database, connectors · **M3** satellite, risk, model ·
**M4** agent, RAG, deploy, demo.

---

## Prompt 0: context (paste first in every new conversation)
```text
Repo: KhetKavach (FORGE hackathon). Read CLAUDE.md, docs/CONTRACTS.md (FROZEN; rulings B-1..B-21
at the end), docs/ARCHITECTURE.md, apps/api/app/schemas.py and apps/web/lib/types.ts before planning.
The code exists and passes tests; your job is to make it work against the real data sources,
fix bugs in the module I name, and keep every check green. Hard rules: no invented data ever (a
failed source is "unavailable"); every external call through apps/api/app/connectors; every number
keeps source + fetched_at + status; the LLM never produces numbers; secrets only from env.
Produce an Implementation Plan and wait for my review. Run the checks and paste output before done.
```

## Phase 0: accounts (M4, not an agent task)
Gemini key (AI Studio) · Copernicus Data Space OAuth client · Telegram bot token + webhook secret ·
Neon Postgres 16 · Vercel project (root `apps/web`) · Google Cloud project with Cloud Run and
Cloud Scheduler · public URLs of both CRIDA PDFs · team ADMIN_KEY. Fill `apps/api/.env`.

## Phase 1: local stack up (M4) · H0–H2
```text
Bring the stack up locally and prove the hello path. Steps: copy .env.example and apps/api/.env.example,
`docker compose up --build`, confirm GET /health returns 200 with db.status "ok", GET /api/districts
returns both districts WITH a bbox (Nominatim reachable), and the web app at :3000 lists them.
If anything fails, find the root cause and propose the smallest fix in the owning module.
Rebuild variant: rebuild apps/api/app/{config,db,errors,main}.py and the Alembic migration from
CONTRACTS.md, comparing with the existing files.
```

## Phase 2: connectors against live sources (M2) · H2–H8
```text
Verify every connector in apps/api/app/connectors against the live upstream for Ludhiana and
Dharwad (use GET /api/districts bbox centres). For each: call it from a `uv run python` shell,
paste the provenance (source, status, fetched_at, request_url), and fix parsing if the live shape
differs. Specifically confirm on the official docs and tell me before changing code:
 1) Open-Meteo Ensemble model ids `ecmwf_ifs025` and `ncep_gefs025`, and that hourly
    `precipitation_memberNN` keys are returned;
 2) Single Runs API: the `run` parameter format and the `ecmwf_ifs` model id (open_meteo.single_run);
 3) Archive API `models=era5_land` with `soil_moisture_7_to_28cm`;
 4) Nominatim returns a district boundary (class "boundary") for both boundary_query strings.
Then disable a source with POST /api/admin/sources/{source}/disable and show the cached response
(or the fallback) appears with a note. Add a pytest for any parser you change (hand-built test
inputs only, under tests/).
```

## Phase 3: satellite live (M3) · H4–H12
```text
Make apps/api/app/connectors/satellite.py work on real data for one real field in each district.
Show: (a) Sentinel Hub Statistical API series length 2017→today and cold latency (target < 20 s);
(b) the Planetary Computer fallback by disabling sentinel_hub; (c) a monsoon-month as_of where the
latest scene is cloudy, the gate emits gate_failed check=cloud and Sentinel-1 radar is added.
If the Statistical API rejects P1D intervals or resolution, adjust per its docs and explain.
```

## Phase 4: data load + RAG (M4 with M3) · H6–H14
```text
Load real data and prove retrieval. 1) `uv run --group data python -m scripts.load_imd --district
PB_LUDHIANA` and KA_DHARWAD (1951–2023); report rows and imd_cells. 2) `scripts.ingest_crida` for
both districts (run --dry-run first; paste the scenario counts). 3) For a soybean field in Dharwad at
flowering and a wheat field in Ludhiana at ripening, print the top 4 retrieved passages with page and
scenario, and judge whether they match the hazard. If headings are mis-detected, improve
app/rag/scenarios.heading_scenario with a test built from the real heading text you saw.
```

## Phase 5: model (M3) · H12–H24
```text
Run `uv run python -m scripts.train_dryspell`. Paste models/dryspell_metrics.json exactly. If the
Brier skill score is <= 0, do not tune on the test years; report "evaluated, not adopted". Commit
the joblib and metrics files. Confirm GET /api/model serves the file and /health shows model_version.
```

## Phase 6: end-to-end live runs (M4) · H14–H20
```text
Register one real field per district through the UI (draw on the satellite basemap) with realistic
crop and sowing date. Run a live assessment for each and paste the full trace (GET
/api/assessments/{id} plus the SSE events). Check: risks have members for ECMWF and GEFS, the
climatology_probability is present, every driver_id exists in evidence, the plan cites real pages,
and status is "completed" (not degraded) when all sources are up. Fix the first divergence from
docs/ARCHITECTURE.md you find, in its owning module only.
```

## Phase 7: Time Machine + alerts (M3 + M2) · H20–H28
```text
Time Machine: confirm exact dates and districts for the three presets in apps/web/app/page.tsx from
IMD bulletins (March 2026 harvest rain → archived forecast replay; August 2023 drought and March
2023 harvest rain → model replay). Register fields there with realistic sowing dates, run each
replay, and check the banner text, replay_basis, the YES/NO display for archived runs, and the
"what actually fell" overlay. Update the preset dates if needed.
Alerts: set the Telegram webhook (infra/deploy.md), send /start <code> hi from a phone, call
POST /api/jobs/monitor with the admin key, and show the alerts_sent row and the message received.
```

## Phase 8: deploy + harden (M4, all) · H28–H36
```text
Deploy per infra/deploy.md (Cloud Run with --no-cpu-throttling --min-instances=1, Vercel, Neon,
Cloud Scheduler). Then run `uv run python -m scripts.edge_cases --base <api-url>` and fix any FAIL.
Run 10 assessments per demo field and report /health latency p50/p95. Pre-warm with
`scripts.admin prewarm`. Tag the last green deploy `demo-ready`.
```

## Phase 9: submission (M4 + all) · H36–H48
```text
Fill the deck placeholders (team, live URL, repo, model metrics verbatim, p95 latency, a real
screenshot). Record the 2–3 minute video on the live URL following the demo script below. Run a
fresh-clone test of README.md on a clean machine and fix every step that breaks.
```

---

## Utility prompts

**Debug a live run**
```text
Assessment <id> misbehaved on <api-url>. Fetch GET /api/assessments/<id> and replay its SSE
stream. Find the first trace event that diverges from docs/ARCHITECTURE.md, explain why in five
lines, and propose the smallest fix in the owning module. No fallback values, no fixtures.
```

**Review a branch**
```text
Review this branch against main as a strict senior reviewer: CONTRACTS.md, schemas.py and types.ts
still agree; every external call is in app/connectors; no fixture or sample data is reachable at
runtime; provenance is kept on every new evidence item; SQL is parameterised; tests added. List
blocking issues first. Then run /verify.
```

**Judge Q&A drill**
```text
Act as a judge scoring Live demo (30), Agentic AI (25), Impact/USP (25), Technical depth (20).
Ask me 10 hard questions about KhetKavach one at a time: is any data dummy; how is the probability
computed; what happens when Sentinel-2 is cloudy; why the Time Machine has no look-ahead; what the
verifier cannot catch; what "micro-location" honestly means. Grade each answer 1–5, then give a
better answer.
```

---

## Demo script (5 minutes)
1. **0:00 Hook.** August 2023, India's driest August since 1901: plans existed for 600+ districts,
   none was triggered for a specific field.
2. **0:30 Live run.** Pick Ludhiana or Dharwad, search a village, draw a field, set crop and sowing
   date, Assess. Narrate the trace: tools in parallel, a gate failure, a fallback, 51 + 31 members.
3. **1:30 Risk card.** Probability with 90% interval and the usual chance; NDVI vs the field's own
   history; the provenance table with fetch times and upstream links.
4. **2:15 Plan.** Dated actions citing a CRIDA page; switch to Hindi; point at verifier_rejected.
5. **3:00 Time Machine.** March 2026 on the forecast actually issued then (YES/NO) with what fell
   overlaid; August 2023 on the model replay, banner explaining why it is not a forecast.
6. **4:00 Robustness.** A judge picks any point: outside the two districts gives the 422 reason;
   a self-intersecting polygon gives its reason; switch a source off and watch the fallback.
7. **4:30 Loop closes.** Run the monitor job; the Telegram alert lands on a phone.
Rehearse at H36, H42 and one hour before judging, once on a phone hotspot only (`/demo-rehearsal`).
