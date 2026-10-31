# FORGE — Predictive Climate & Micro-Location Yield Engine: Strategy Plan

Oct 31, 2026 · @Chand

## Assumptions to confirm

We should build a field-level early-warning agent. It forecasts drought
and unseasonal-rain risk as probabilities, then writes a cited action
plan matched to the crop's stage. The organisers haven't stated the team
size or build window, so this plan uses the defaults below. Send the
real numbers and I'll re-cut sections G and H.

| Assumption | Planned value | What changes if different |
|----|----|----|
| Team size | 4 people (one strong in Python/data, one in React) | Section G gives 2-, 3- and 5-person splits |
| Build window | 48 continuous hours, with a cut line at hour 24 | Shorter: every P1 feature moves to P2 |
| Paid services | None. Free tiers only (Gemini, Copernicus, Open-Meteo, Vercel, Neon) | Paid credits add headroom but don't change the design |
| Hardware | None assumed | If you own an ESP32 and a soil-moisture probe, the live sensor becomes P1 |
| Demo geography | Two Indian districts: one drought case, one unseasonal-rain case | We need the district contingency plan PDFs for whichever districts we pick |

- [ ] Exact build window, and whether downloading open datasets before
  the clock starts is allowed. The rules say core logic must be written
  inside the window.

- [ ] Do you have ESP32 or soil-sensor hardware?

- [ ] Which LLM keys or credits does the team hold beyond the free
  Gemini tier?

- [ ] Is there a mid-point review or idea-submission round?

- [ ] Each member's real skill level, so roles in section G match people

## A. Problem statement breakdown

India doesn't lack weather data. What's missing is a forecast for one
specific field this week, and the action that field needs. Today's
forecasts and advisories work at grid or district scale. They give one
most-likely outcome, and nothing triggers them for a particular field.

**The real problem, in two recent events**

- **Drought.** August 2023 was India's driest August since records began
  in 1901, with rainfall about 36% below normal. IMD put most of the
  cause on developing El Niño conditions.

- **Unseasonal rain.** In March 2023, rain and hail flattened wheat
  close to harvest across Punjab, Haryana, UP, MP and Rajasthan. IMD
  told farmers in Punjab, Haryana and West MP to postpone harvesting.
  The warning was right, but it covered whole regions, not specific
  fields.

**Root causes**

1.  **Scale mismatch.** Global ensemble forecasts run at about 25 km
    (0.25°), and IMD's gridded rainfall is 0.25°. Field decisions are
    made at about 1 ha.

2.  **No probabilities.** Farmers get "rain likely" when they need "a
    70% chance of more than 20 mm before Thursday".

3.  **Optical satellites go blind in the monsoon.** Persistent cloud
    blocks Sentinel-2 right when crops are most at risk. Radar
    (Sentinel-1) sees through cloud but is rarely used outside research.

4.  **Plans are static.** ICAR-CRIDA has written contingency plans for
    600+ districts, organised by weather scenario. They are PDFs that
    nobody triggers when a scenario actually starts.

5.  **Data silos.** Satellite, soil and weather data sit on separate
    portals (Copernicus, Bhuvan/VEDAS, IMD). Each needs expertise to
    use.

**Target users.** I recommend building for the person who acts on behalf
of many farmers, not a farmer chatbot. Judges have seen dozens of farmer
chatbots.

| User | Need | How they use it |
|----|----|----|
| FPO agronomist / KVK extension officer (primary) | Know which of 200 fields need action this week | Portfolio risk list, field risk cards, alerts |
| Farmer (receives output) | One clear action, in their language, in time | Telegram/SMS alert in Hindi or a regional language |
| District agriculture officer | When to activate the contingency plan | District roll-up of field risk |
| Crop insurer / rural lender (later) | Early sight of loss events | API and portfolio export (roadmap only) |

**Existing solutions and their gaps**

| Existing | What it does | Gap we fill |
|----|----|----|
| IMD MausamGram / district forecasts | Hyper-local forecast by gram panchayat or pincode | No view of crop condition, no probabilities, no action plan |
| ICAR-CRIDA District Agriculture Contingency Plans | Expert actions per weather scenario | Static and never triggered; we make them live and field-specific |
| ISRO VEDAS / Bhuvan | NDVI, soil moisture and LULC visualisation | Portals for experts, not a decision for a person |
| Generic LLM chatbots | Fluent advice | Not grounded in this field's data; invent numbers |

**What judges will score.** Our plan for each pillar of the rubric:

| Pillar | Points | What they'll look for | How we score it |
|----|----|----|----|
| Live demonstration and robustness | 30 | Runs live, survives bad inputs and network loss | Cached real responses, fallbacks for every source, labels showing when each data point was fetched |
| AI reasoning and agentic execution | 25 | Multi-step tool use, self-correction, no hallucination, sources | Agent graph with quality gates, a verifier node, cited plans, a visible trace |
| Relevance, impact and USP | 25 | Real users, clear difference from chatbots | Field-level probabilities plus triggered contingency plans, and a backtest on real events |
| Technical depth | 20 | Beyond an API wrapper; geospatial models | Satellite pipeline, radar fallback, a trained and evaluated risk model |

**Hard constraints**

- **No dummy data (zero tolerance).** Every number must come from a live
  API, a live database or an official open dataset. A database cache of
  real API responses, labelled with source and fetch time, is allowed.
  JSON fixtures in the repo are not.

- Core logic, models and agent workflows must be built inside the
  hackathon window. Libraries and boilerplate are fine.

- Every member must be able to explain the architecture and code on
  their own.

- Free-tier limits: Open-Meteo is free for non-commercial use under
  10,000 calls a day. Copernicus Sentinel Hub allows 10,000 processing
  units and 10,000 requests a month, at 300 a minute each. Gemini's free
  tier is limited per minute and per day.

**Mandatory deliverables**

- [ ] Live URL (Vercel frontend + hosted API)

- [ ] 2–3 minute video of the live system end to end, showing AI
  reasoning and tool use

- [ ] Public GitHub repo: README with setup steps, an architecture
  diagram and all source code

- [ ] 5–7 slide deck

- [ ] Submission write-up: problem, target users, solution, architecture

## B. Winning product concept

**KhetKavach** (working name, "field shield") is an AI agent that
watches each registered field from space and from the ground. It gives
the probability of a dry spell or damaging rain over the next 15 days,
and issues a cited, crop-stage-aware action plan before the damage
happens.

**One run, end to end**

1.  An FPO agronomist draws a field on the map (or picks a village) and
    enters the crop and sowing date.

2.  The agent plans its evidence gathering and calls tools in parallel:

    - Sentinel-2 vegetation and water indices for the field

    - Sentinel-1 radar when cloud blocks optical imagery

    - Soil moisture, from an in-field sensor or the modelled layer

    - A 51-member ECMWF ensemble forecast

    - IMD rainfall history back to 1901

3.  Quality gates check each result for cloud cover, staleness and gaps.
    When one fails, the agent switches to the fallback source and
    records why.

4.  The risk engine turns the evidence into probabilities, weighted by
    how sensitive the current crop stage is. Example: "dry spell of 10+
    days, 62%".

5.  The planner pulls the matching scenario from that district's
    ICAR-CRIDA contingency plan and writes a dated action plan with
    citations.

6.  A verifier rejects any number or claim not found in the tool outputs
    or retrieved passages, then forces a rewrite.

7.  A monitoring loop re-runs registered fields every 6 hours. When risk
    crosses a threshold, it pushes an alert to the agronomist's and
    farmer's phones.

**Time Machine mode.** The same pipeline can run "as of" a past date on
archived real data. That lets us show what it would have said before
August 2023's drought or March 2023's harvest-time rain, without
inventing anything. It also solves a demo problem: in November, live
fields may all show low risk, and Time Machine supplies the drama with
real data. One honest limit: Open-Meteo keeps individual ensemble
members for only about three days. A 2023 replay therefore uses the
archived deterministic forecast (Historical Forecast API, from 2021)
plus observed satellite and soil state, and the UI labels it
"deterministic replay".

**What "micro-location" honestly means here.** Field-level detail comes
from 10 m satellite pixels and the in-field sensor. Weather forecasts
stay on a grid of about 25 km. The UI says so. Judges reward that
honesty, and it pre-empts the hardest technical question.

**On "yield".** We output yield-risk exposure: which hazard hits which
growth stage, and how severely, according to the contingency plan. We do
not output a tonnes-per-hectare prediction. Without ground-truth field
yields we couldn't validate one, and the rubric penalises unvalidated
accuracy claims.

## C. Unique differentiators

Our USP: probabilistic field-level risk that triggers official, cited
contingency actions automatically, backed by a backtest on real events.
Most teams will ship either a dashboard or a chatbot. We ship the loop
between them.

| Differentiator | Typical hackathon build | Ours | Rubric pillar |
|----|----|----|----|
| Probabilities, not adjectives | "Rain expected" from one forecast | Share of 51 ECMWF ensemble members (plus 31 GFS members) exceeding a crop-relevant threshold | AI accuracy |
| Field-level evidence | District averages | Sentinel-2 NDVI/NDWI anomaly against the field's own history since 2017 and its 2 km neighbourhood | Technical depth |
| Sees through monsoon cloud | Gaps in imagery or a cloudy picture | Sentinel-1 VV/VH radar fallback, chosen by a quality gate | Technical depth, robustness |
| Plans you can audit | LLM free text | RAG over ICAR-CRIDA district plans, each action cited by page, with a verifier on every number | Guardrails |
| Self-correcting agent, visible | Hidden single prompt | State graph with retries and fallbacks, streamed live as a reasoning timeline | Agentic execution |
| Proof, not claims | No evaluation | Time Machine replays plus a model scored against a climatology baseline on a held-out period | Impact, accuracy |
| Closes the loop | User must check the app | Scheduled monitoring with Telegram alerts in Hindi | Agentic execution, impact |

## D. Feature prioritization

Ten P0 features make a complete, live, honest loop. That loop alone can
score in every rubric pillar. P1 features are what move us from good to
winning, and they start only after the P0 loop is deployed. Effort
figures are my person-hour estimates, to be re-checked at the hour-4
checkpoint.

| \# | Tier | Feature | Main rubric pillar | Effort (person-h, est.) | Owner |
|----|----|----|----|----|----|
| 1 | P0 | Field picker: draw a polygon or search a village; crop and sowing date | Demo | 4 | Frontend |
| 2 | P0 | Sentinel-2 L2A NDVI/NDWI time series per field, cloud-masked (Planetary Computer; Copernicus Sentinel Hub as fallback) | Technical depth | 8 | Geo/ML |
| 3 | P0 | Weather connectors: Open-Meteo ensemble, forecast and archive; IMD gridded rainfall history | Technical depth | 6 | Backend |
| 4 | P0 | Soil-moisture layer from Open-Meteo's modelled soil moisture, labelled "modelled" | Relevance | 2 | Backend |
| 5 | P0 | Risk engine v1: ensemble exceedance probabilities for dry spell and heavy rain, weighted by crop-stage sensitivity | AI accuracy | 6 | Geo/ML |
| 6 | P0 | Agent graph: plan, parallel tools, quality gates, retry and fallback | Agentic | 8 | AI lead |
| 7 | P0 | RAG over CRIDA contingency plans for the demo districts; cited plan; number verifier | Guardrails | 8 | AI lead |
| 8 | P0 | Risk card UI: evidence charts, live agent trace, data-provenance panel | Demo | 10 | Frontend |
| 9 | P0 | Postgres cache of real responses, timeouts, degraded mode with clear labels | Robustness | 4 | Backend |
| 10 | P0 | Deployed end to end with health checks | Demo | 3 | AI lead |
| 11 | P1 | Dry-spell ML model (LightGBM), trained on IMD and ERA5-Land, evaluated on a held-out period against climatology | Technical depth, accuracy | 10 | Geo/ML |
| 12 | P1 | Time Machine replay: August 2023 drought and March 2023 rain at harvest | USP, demo | 6 | Backend + Geo/ML |
| 13 | P1 | Sentinel-1 VV/VH radar fallback when cloud cover passes the threshold | Technical depth | 5 | Geo/ML |
| 14 | P1 | Scheduled monitoring plus Telegram bot alerts | Agentic | 5 | Backend |
| 15 | P1 | Plans in Hindi plus one regional language | Impact | 2 | AI lead |
| 16 | P1 | ESP32 live soil sensor, only if you have the hardware | Demo, impact | 6 | Backend |
| 17 | P2 | Monsoon analog years: find past seasons (IMD, 1901 onwards) that most resemble this one, and show what followed | USP | 6 | Geo/ML |
| 18 | P2 | Neighbourhood stress map (this field against its 2 km surroundings) | Demo | 4 | Frontend |
| 19 | P2 | Voice-note version of the alert | Impact | 3 | AI lead |

**Features to avoid** (each costs more hours than it earns in points)

- Field-level yield regression in t/ha: no ground truth to validate it
  against, so it invites a fabricated-accuracy question.

- Training CNNs or U-Nets on imagery for crop classification: days of
  work, and the rubric doesn't reward it over a working loop.

- WhatsApp Business API: approval takes days. Telegram is free and
  instant.

- A native mobile app, microservices, Kafka or Kubernetes: complexity
  with no gain in judging value.

- Login and auth flows on the demo path: a stuck login is the commonest
  cause of a dead live demo.

- All-India coverage: pick two districts and make them flawless. The
  architecture already scales.

## E. Recommended technology stack

The stack is Python for everything that touches data and models, and
Next.js for the interface. Postgres, with PostGIS and pgvector, is the
only database. Every external source has a named fallback. Exact install
and configuration commands come with each phase's Antigravity prompt, so
they are tested against the real repo state.

| Layer | Choice | Why we need it | Alternative considered |
|----|----|----|----|
| Frontend | Next.js (App Router), TypeScript, Tailwind, shadcn/ui | Fast to build and polished; deploys free on Vercel | Vite + React (no SSR benefit here) |
| Map and drawing | MapLibre GL JS + Terra Draw | Open source, no map token, polygon drawing | Leaflet (simpler, weaker vector styling) |
| Charts | Recharts | NDVI, rainfall and ensemble-spread charts in React | Plotly (heavier bundle) |
| Live agent trace | Server-Sent Events from FastAPI | One-way streaming is all we need; simpler than WebSockets | WebSockets |
| API | Python 3.11 + FastAPI + Pydantic v2 | The geospatial and ML libraries are Python; typed contracts; automatic OpenAPI docs | Node (would split the stack) |
| Agent orchestration | LangGraph | Justified here: branching quality gates, retries, a verifier loop and a streamable state graph | Hand-written async state machine (fallback if LangGraph slows us) |
| LLM | Gemini Flash via Google AI Studio (free tier), JSON-schema structured output | Free, fast, multilingual; Antigravity is Google's tool too | Groq-hosted open models as backup |
| Embeddings | sentence-transformers with multilingual-e5-small (384-dim), on CPU in the API container | No API rate limits; handles Hindi passages | Gemini embeddings |
| Geospatial | pystac-client, planetary-computer, stackstac / odc-stac, rioxarray, shapely, sentinelhub-py | Read only the field's pixels from cloud-optimised GeoTIFFs | Google Earth Engine (needs a Cloud project and approval) |
| ML | pandas, xarray, scikit-learn, LightGBM, imdlib | Tabular risk model with honest metrics; imdlib reads IMD gridded data | XGBoost |
| Database | PostgreSQL 16 + PostGIS + pgvector on Neon or Supabase | Field polygons, time series cache, RAG vectors in one place | MongoDB (weak geospatial joins) |
| Scheduler | APScheduler in the API, or Cloud Scheduler calling a secured endpoint | 6-hourly monitoring without new infrastructure | Celery + Redis (overkill) |
| Alerts | Telegram Bot API | Free, instant and demoable on a judge's phone | SMS via a paid gateway |
| Hosting | Vercel (frontend), Google Cloud Run or Render (API, Docker), Neon (database) | Free tiers; container gives a reproducible build | Hugging Face Spaces (Docker) |
| CI | GitHub Actions: lint, tests, Docker build | Keeps main deployable | None |
| Observability | Structured JSON logs, a /health endpoint, an agent-run table in Postgres | Debug live failures in minutes | Sentry free tier (add if time) |

**Checked data sources** (checked 31 Oct 2026; re-check on day 0)

| Source | We use it for | Access | Limits and caveats | Fallback |
|----|----|----|----|----|
| [Microsoft Planetary Computer STAC](https://planetarycomputer.microsoft.com/api/stac/v1) | Sentinel-2 L2A (10 m, revisit about 5 days) and Sentinel-1 | Free; works without a key (signed URLs through the SDK) | Fair use; a key raises limits | Copernicus Sentinel Hub |
| [Copernicus Data Space (Sentinel Hub APIs)](https://documentation.dataspace.copernicus.eu/Quotas.html) | Statistical API: per-field NDVI time series computed server-side | Free account, OAuth client credentials | 10,000 processing units and 10,000 requests a month; 300 of each a minute | Planetary Computer |
| [Open-Meteo Ensemble API](https://open-meteo.com/en/docs/ensemble-api) | Probabilistic rain and ET₀: ECMWF IFS 51 members (15 days), GFS 31 members (10 days) | No key | Non-commercial; under 10,000 calls a day, 5,000 an hour, 600 a minute; individual members kept only about 3 days | Open-Meteo deterministic forecast |
| [Open-Meteo Historical Weather / Forecast archive](https://open-meteo.com/) | ERA5 / ERA5-Land history from 1940, including soil moisture; archived forecasts from 2021 | No key | Reanalysis at about 9–25 km; attribution required | NASA POWER |
| [IMD gridded rainfall via imdlib](https://imdlib.readthedocs.io/en/latest/Usage.html) | Daily 0.25° rainfall since 1901: climatology, SPI, training labels | Open download from IMD Pune | Pre-load into Postgres at setup | Open-Meteo ERA5 |
| [NASA POWER](https://power.larc.nasa.gov/llms.txt) | Agroclimatology daily point data | No authentication | Coarse (about 0.5°) | Open-Meteo archive |
| [IMD APIs](https://mausam.imd.gov.in/responsive/apis.php) | Official district warnings shown as an overlay | Needs IP whitelisting; free for non-commercial use | Cloud Run egress IPs aren't static unless configured; apply on day 0 | Skip the overlay; never block on it |
| [ICAR-CRIDA District Agriculture Contingency Plans](https://krishi.icar.gov.in/jspui/handle/123456789/31130?mode=full) | RAG corpus of actions per weather scenario per district | Public PDFs | Older plans; cite the year of each | Generic ICAR advisories |
| [ISRO Bhuvan API](https://www.nrsc.gov.in/sites/default/files/pdf/ebooks/UIM-2022/uim_15.pdf) / [VEDAS](https://www.isro.gov.in/VedasServices.html) | Reverse geocoding to village; LULC context; NDVI cross-check | Bhuvan API needs a free token | Programmatic VEDAS access is poorly documented: test on day 0 | Copernicus covers the satellite requirement |
| [ISRIC SoilGrids](https://docs.isric.org/globaldata/soilgrids/) | Soil texture (optional) | REST API **paused**; WCS still available | Do not depend on it | Leave out |
| ESP32 + capacitive probe (optional) | A real in-field sensor feed | Our own /sensors/ingest endpoint with a device key | Only if hardware exists | Modelled soil moisture, clearly labelled |

## F. System architecture

The system has one API service, one database and one frontend, with a
LangGraph agent at the centre. The agent calls deterministic tools for
data and numbers, and uses the LLM only to plan the wording and write
the cited action plan. Every external call goes through a connector
layer with caching, timeouts and a fallback source. That one rule
protects the 30 live-demo points.

flowchart LR  
subgraph Client  
UI\["Next.js on Vercel\<br/\>map, risk card, agent trace"\]  
TG\["Telegram alert"\]  
ESP\["ESP32 sensor (optional)"\]  
end  
subgraph API\["FastAPI service on Cloud Run"\]  
R\["REST + SSE routes"\]  
AG\["LangGraph agent"\]  
RE\["Risk engine\<br/\>ensemble probabilities + LightGBM"\]  
RG\["Retriever + verifier"\]  
SC\["Scheduler, every 6 h"\]  
CN\["Connectors\<br/\>cache, timeout, fallback"\]  
end  
DB\[("Postgres + PostGIS + pgvector")\]  
subgraph Ext\["External sources"\]  
PC\["Planetary Computer STAC\<br/\>Sentinel-2, Sentinel-1"\]  
SH\["Copernicus Sentinel Hub"\]  
OM\["Open-Meteo\<br/\>ensemble, forecast, archive"\]  
IMD\["IMD gridded rainfall, IMD API"\]  
BH\["Bhuvan API"\]  
GM\["Gemini Flash"\]  
end  
UI --\>\|"POST /api/assessments"\| R  
R --\>\|"SSE trace events"\| UI  
ESP --\>\|"POST /api/sensors/ingest"\| R  
R --\> AG  
SC --\> AG  
AG --\> CN  
AG --\> RE  
AG --\> RG  
RG --\> GM  
CN --\> PC  
CN --\> SH  
CN --\> OM  
CN --\> IMD  
CN --\> BH  
CN \<--\> DB  
RE \<--\> DB  
RG \<--\> DB  
AG --\>\|"threshold crossed"\| TG

**Agent graph** (LangGraph nodes; every transition streams to the UI as
a trace event)

flowchart TD  
A\["intake: validate polygon, crop, stage"\] --\> B\["plan: choose tools
for crop stage and season"\]  
B --\> C\["gather: parallel tool calls"\]  
C --\> D{"quality gate: cloud, staleness, gaps"}  
D --\>\|"fail"\| E\["fallback: switch source, log reason"\]  
E --\> C  
D --\>\|"pass"\| F\["assess risk: probabilities + drivers"\]  
F --\> G\["retrieve: district plan passages for scenario and stage"\]  
G --\> H\["draft plan: Gemini, JSON schema"\]  
H --\> I{"verify: every number in evidence, every action cited"}  
I --\>\|"fail, up to 2 retries"\| H  
I --\>\|"still failing"\| J\["rule-based plan from retrieved
passages"\]  
I --\>\|"pass"\| K\["persist, notify, respond"\]  
J --\> K

**How the components talk to each other**

| From → to | Protocol | Contract |
|----|----|----|
| Frontend → API | HTTPS JSON | POST /api/fields, GET /api/fields, POST /api/assessments (body: field_id, optional as_of for Time Machine, language) returns 202 + assessment_id |
| API → frontend | Server-Sent Events | GET /api/assessments/{id}/stream: events node_started, tool_result, gate_failed, fallback_used, verifier_rejected, done |
| Frontend → API | HTTPS JSON | GET /api/assessments/{id}: risk card with risks\[\], evidence\[\], plan\[\], sources\[\], data_freshness |
| Sensor → API | HTTPS JSON + X-Device-Key | POST /api/sensors/ingest: device_id, soil_moisture_pct, temp_c, rh_pct, ts |
| Telegram → API | Bot webhook | /start \<field code\> links a chat to a field |
| Scheduler → agent | In-process call, or POST /api/jobs/monitor with X-Admin-Key | Re-assess every monitored field; alert on a threshold crossing |
| Connectors → database | SQL | Read-through cache keyed by source + request hash, with fetched_at and expires_at |
| Ops → API | HTTPS | GET /health: per-source status and latency, model version, database status |

**Database tables** (full DDL, indexes and migrations arrive in Phase 1)

- fields: id, name, geom geometry(Polygon, 4326) with a GiST index,
  crop, sowing_date, district_code

- observations: field_id, source, variable, ts, value, fetched_at; index
  on (field_id, variable, ts)

- api_cache: key, source, response jsonb, fetched_at, expires_at

- imd_rain_daily: grid cell, date, mm; pre-loaded with imdlib for the
  demo states

- assessments: id, field_id, as_of, risks jsonb, plan jsonb, status,
  model_version

- agent_steps: assessment_id, seq, node, tool, status, latency_ms,
  detail jsonb (this table is the trace)

- doc_chunks: district_code, scenario, crop, page, text, embedding
  vector(384)

- sensor_readings, alert_subscriptions, alerts_sent

**Error handling**

- Every connector call gets a timeout (8 s for weather, 20 s for
  imagery), one retry with backoff, then the fallback source, then the
  last cached real value. Cached values are labelled "as of \<fetch
  time\>".

- If a source has no real value at all, its evidence row reads
  "unavailable". The risk engine widens its uncertainty, and the plan
  says which input was missing. Nothing is ever filled with a
  placeholder.

- LLM failure or rate limit (HTTP 429): retry with backoff, then the
  rule-based plan built from retrieved passages, so the user still gets
  cited actions.

- Input validation returns HTTP 422 with a reason: a polygon over 50 ha,
  outside India or self-intersecting; a sowing date in the future; an
  unknown crop.

- API keys live only on the server. The frontend never sees one.

## G. Team responsibility distribution

The split has four owners, each with one module and a written contract
with the others. By hour 4, every owner works against the agreed JSON
schemas, so nobody waits on anybody. Each person also has to explain one
neighbouring module, because judges can question any member on any part.

| Role | Owns | Delivers by hour 12 | Depends on | Explains in Q&A (backup) |
|----|----|----|----|----|
| M1 Frontend engineer | Next.js app, map and drawing, risk card, live trace view, charts, Hindi rendering | Draw a field, start an assessment, render the trace from the SSE stream | M2 API contracts (frozen at hour 4) | Agent graph (M4) |
| M2 Backend and database engineer | FastAPI, Postgres/PostGIS schema, connectors with cache and fallback, scheduler, Telegram, sensor ingest | Live weather and ensemble connectors behind the cache; fields and assessments endpoints | M3 needs the observations schema | Satellite pipeline (M3) |
| M3 Geo and ML engineer | Sentinel-2/1 pipeline, IMD history load, risk engine, LightGBM model and evaluation, Time Machine data | Per-field NDVI/NDWI series from real imagery; risk engine v1 on ensemble data | M2 cache and schema | Backend and database (M2) |
| M4 AI, integration and deploy lead | LangGraph agent, CRIDA RAG and verifier, prompts, deployment, CI, end-to-end tests, demo video, deck, task board | Agent running tools end to end on the deployed stack; CRIDA PDFs for the two districts indexed | Everyone's interfaces | Frontend (M1) |

**Integration checkpoints** (15 minutes each, all four people, against
the deployed URL rather than localhost)

1.  **H4, contracts frozen.** Pydantic and TypeScript types merged; a
    deployed hello-world path runs from frontend to API to database.

2.  **H12, first real loop.** One real field produces a real risk card,
    even if it's ugly.

3.  **H20, P0 complete.** All ten P0 features on the live URL. Decide
    which P1 features we can afford.

4.  **H30, P1 cut.** Anything unfinished is dropped or hidden. From here
    we only harden.

5.  **H40, code freeze.** Bug fixes only. Record the video, finish the
    deck, run the README test on a clean machine.

**Other team sizes**

- **2 people:** A takes M1 + M4 (UI, agent, deploy); B takes M2 + M3
  (data, model). Drop items 13, 16, 17 and 18.

- **3 people:** M1 alone; M2 takes the backend plus deployment; M3 + M4
  merge into AI/ML. Drop items 16 and 17.

- **5 people:** M5 owns quality and the demo: test suite, edge-case
  scripts, Time Machine curation, video, deck and Q&A rehearsal.

## H. Phase-wise timeline

We deploy at hour 4 and have the full P0 loop live by hour 20. From hour
30 we only harden, and code freezes at hour 40. Phases overlap
deliberately so all four people stay busy. Each phase's files, commands,
API contracts, tests and its Antigravity prompt come once you approve
this plan, starting with Phase 1.

<img src="media/image1.png" style="width:6in;height:3.5625in"
alt="48-hour build plan · 10 phases, 5 checkpoints" />

48-hour build plan · 10 phases, 5 checkpoints

The dashed line marks H20, the checkpoint that decides how many P1
features we can afford.

| Phase | Owner | Exit criterion (must be true on the deployed URL) |
|----|----|----|
| 0\. Accounts and keys | M4 | Gemini key, Copernicus OAuth client, Telegram bot token, Neon database, Vercel and Cloud Run projects; IMD whitelisting requested; CRIDA PDFs for both districts saved |
| 1\. Skeleton and deploy | All | Monorepo with Docker and green CI; deployed path from frontend to API to database; contracts frozen |
| 2\. Data connectors | M2 | Ensemble, forecast, archive, soil-moisture and IMD-history data are all real and served through the cache; /health reports each source |
| 3\. Satellite pipeline | M3 | Cloud-masked NDVI/NDWI series from 2017 to today for a real field, returned in under 20 s cold |
| 4\. Frontend | M1 | Draw a field, assess it, watch the live trace and read the risk card on the live URL |
| 5\. Agent, RAG, verifier | M4 | Full graph runs; a deliberately wrong number is rejected by the verifier; every action cites a page |
| 6\. Risk engine and model | M3 | Ensemble probabilities by H14; LightGBM with held-out metrics against climatology by H24, reported exactly as measured |
| 7\. Time Machine and alerts | M2 + M3 | August 2023 and March 2023 replays run on archived data; a Telegram alert arrives on a phone |
| 8\. Hardening and tests | All | Edge-case suite passes; a killed source triggers its fallback; p95 assessment latency measured and shown |
| 9\. Video and deck | M4 + all | Video recorded on the live URL; 5–7 slide deck; README passes a fresh-clone test; Q&A rehearsed |

**If the window is 24 hours.** Phases 0–6 deliver P0 only by H16, with
the model replaced by ensemble probabilities. Hardening runs H16–20, and
video and deck H20–24. Time Machine survives as the one P1 feature,
because it carries the demo.

## I. Technical risks and mitigation

The biggest risk is not technical. It's a judge deciding something is
dummy data. So the first mitigation is provenance on every number: its
source, its fetch time, and whether it is live, cached or archived. The
rest are listed by how likely they are to hurt us.

| Risk | Likelihood | Impact | Mitigation | Fallback |
|----|----|----|----|----|
| A judge reads cached or replayed data as "dummy" | Medium | Disqualification | Provenance panel on every card; Time Machine banner says "real archived data as of \<date\>"; no fixtures in the repo | Show the raw upstream request URL in the trace |
| Cloud-free Sentinel-2 scene unavailable (monsoon) | High in Jun–Sep | Missing crop evidence | Cloud mask from the scene classification layer; quality gate | Sentinel-1 radar; last clear scene with its age shown |
| Gemini free-tier limits hit during the demo | Medium | Plan step fails live | One LLM call per assessment; cache plans by input hash; backoff on 429 | Rule-based plan from retrieved CRIDA passages; second key or Groq backup |
| Imagery reads slow (COG over the network) | Medium | Latency over 30 s | Read only the field window; Sentinel Hub Statistical API computes server-side; pre-warm the demo fields | Cached real series with its fetch time |
| Open-Meteo or Copernicus quota exhausted | Low | Source down | Read-through cache; under 10,000 calls a day is comfortable for our volumes | Switch source (Sentinel Hub ↔ Planetary Computer; NASA POWER for history) |
| ML model shows no skill over climatology | Medium | Weak accuracy story | Report it honestly; ship ensemble probabilities as the primary signal | Present the model as "evaluated, not yet adopted", which judges respect more than a fake score |
| IMD whitelisting not approved in time | High | Lose the official warnings overlay | Apply on day 0 | IMD gridded history still works; overlay hidden |
| LLM invents an action not in the contingency plan | Medium | Guardrail points lost | Structured output, each action keyed to a passage id; verifier checks numbers and citations | Rule-based plan |
| Integration breaks late | Medium | Dead demo | Deploy from hour 4; contract tests in CI; freeze at H40 | Tag the last green deploy; roll back in one command |
| Team members can't explain code written by Antigravity | Medium | Fails the code-ownership rule | Every PR explained by its author at checkpoints; each member owns a backup module | Q&A rehearsal at H44 |
| Demo venue Wi-Fi fails | Medium | Live demo blocked | Phone hotspot; pre-warmed cache | The video is backup only, never presented as the live demo |

## J. Expected final demonstration

The demo proves three things in five minutes. The data is real and live.
The agent reasons and recovers from failures in front of the judges. And
on a documented past disaster, it would have warned in time. The 2–3
minute submission video follows the same script, compressed, recorded
against the live URL.

1.  **0:00–0:30, the hook.** Show the August 2023 rainfall deficit on
    the map. "Contingency plans for this existed for 600+ districts.
    Nobody triggered them for a specific field."

2.  **0:30–1:30, a live run on a real field today.** Draw a field in a
    demo district, choose the crop and sowing date, and press Assess.
    The trace streams as tool calls fire: Sentinel-2 scenes found, a
    cloudy scene rejected by the quality gate, Sentinel-1 used instead,
    51 ensemble members fetched.

3.  **1:30–2:15, the risk card.** Probabilities with their drivers, an
    NDVI anomaly against the field's own history, the ensemble spread
    chart, and the provenance panel with every source and fetch time.

4.  **2:15–3:00, the plan.** Dated actions, each citing a page in the
    district contingency plan. Switch to Hindi. Point at the verifier
    step in the trace, where it rejected a draft whose number wasn't in
    the evidence.

5.  **3:00–4:00, Time Machine.** Re-run a field in Punjab as of
    mid-March 2023 on archived real data. The agent flags heavy-rain
    risk at the harvest stage and recommends delaying harvest and
    protecting grain. That matches IMD's actual advisory to farmers
    then.

6.  **4:00–4:30, robustness on request.** A judge picks any point in
    India, or enters a self-intersecting polygon. We show the 422 with
    its reason. Then we kill one source live (a toggle in the admin
    panel) and the fallback appears in the trace.

7.  **4:30–5:00, the loop closes.** The monitoring job runs, and a
    Telegram alert lands on a phone in the room. Close on architecture
    and scale: same pipeline, any district with a contingency plan.

**Rehearsal rule.** Run the full script on the deployed URL at H36, H42
and one hour before judging. Rehearse it once with Wi-Fi off and only a
phone hotspot.

## Sources

- Forge buildathon themes, submission template and rubric: the organiser
  page you attached

- [Copernicus Data Space Ecosystem, Quotas and
  Limitations](https://documentation.dataspace.copernicus.eu/Quotas.html)

- [Open-Meteo Ensemble API
  documentation](https://open-meteo.com/en/docs/ensemble-api)

- [Open-Meteo: limits on free API
  usage](https://openmeteo.substack.com/p/weather-data-for-multiple-locations)
  and [Historical Forecast
  API](https://openmeteo.substack.com/p/introducing-the-historical-forecast)

- [Planetary Computer Sentinel-2 L2A example
  notebook](https://nbviewer.org/github/microsoft/PlanetaryComputerExamples/blob/main/datasets/sentinel-2-l2a/sentinel-2-l2a-example.ipynb)

- [IMDLIB usage: IMD gridded rainfall
  download](https://imdlib.readthedocs.io/en/latest/Usage.html)

- [IMD APIs page (IP
  whitelisting)](https://mausam.imd.gov.in/responsive/apis.php) and [IMD
  RTI reply: free for non-commercial
  use](https://internal.imd.gov.in/section/rti/rticases/20260112_rti_211.pdf)

- [NASA POWER API reference](https://power.larc.nasa.gov/llms.txt)

- [ISRIC SoilGrids: REST API
  paused](https://docs.isric.org/globaldata/soilgrids/)

- [NRSC Bhuvan geospatial services (API
  list)](https://www.nrsc.gov.in/sites/default/files/pdf/ebooks/UIM-2022/uim_15.pdf)
  and [ISRO VEDAS services](https://www.isro.gov.in/VedasServices.html)

- [ICAR-CRIDA District Agriculture Contingency Plans
  bulletin](https://krishi.icar.gov.in/jspui/handle/123456789/31130?mode=full)
  and [ICRISAT ISSCA summary (650
  plans)](https://issca.icrisat.org/scalable-solutions/district-level-agriculture-contingency-and-drought-proofing-plan-for-mitigation-and-adaptation-to-climate-change)

- [Sentinel-1 for soybean monitoring in monsoon, ISPRS
  2019](https://isprs-archives.copernicus.org/articles/XLII-3-W6/109/2019/isprs-archives-XLII-3-W6-109-2019.pdf)

- [India's driest August since 1901 (Anadolu, 1 Sep
  2023)](https://aa.com.tr/en/asia-pacific/india-sees-driest-august-in-122-years/2980940)
  and [Business Today, 31 Aug
  2023](https://www.businesstoday.in/latest/economy/story/after-driest-august-since-1901-india-could-receive-average-rains-in-september-imd-official-396440-2023-08-31)

- [IMD advises postponing wheat harvest (PTI, 18 Mar
  2023)](https://www.udayavani.com/english-news/unseasonal-rains-imd-asks-farmers-of-punjab-haryana-mp-to-postpone-harvesting)
  and [CRISIL impact note, March
  2023](https://integraliq.crisil.com/content/dam/crisil/our-analysis/views-and-commentaries/impact-note/2023/03/drenching-damages-some-rabi-crops.pdf)

- [Google Antigravity overview (Real
  Python)](https://realpython.com/ref/ai-coding-tools/google-antigravity/)
