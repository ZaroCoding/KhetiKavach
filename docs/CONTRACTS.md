# KhetKavach Contracts

Single source of truth for API shapes, SSE events, and database tables. Derived from
`docs/STRATEGY.md` section F, the build runbook, the decisions for Q-1..Q-23 (see "Decisions
log") and the build rulings B-1..B-21 that closed every remaining question and conflict (see
"Rulings"). Change this file first, then Pydantic models (`apps/api/app/schemas.py`) and
TypeScript types (`apps/web/lib/types.ts`).

**Status: FROZEN** (all `[R-n]` tags below are now decided by the ruling of the same number).

## Conventions

- **Examples show types, not values.** Any value in angle brackets (`"<number 0..1 | null>"`) is a
  type descriptor. No example here is real data (CLAUDE.md hard rule 1).
- **`[R-n]` tag = provisional.** The decisions left a gap; the value shown is the smallest concrete
  choice, and the gap is listed as REMAINING QUESTION R-n at the end. Untagged = decided.
- IDs: `fields.id`, `assessments.id`, `doc_chunks.id` are UUID v4, server-generated. Tables
  `observations`, `agent_steps`, `sensor_readings`, `alerts_sent` use `bigint` identity.
- Timestamps: ISO 8601 UTC, e.g. `"<YYYY-MM-DDTHH:MM:SSZ>"`. Dates: `"<YYYY-MM-DD>"`.
  GeoJSON coordinates are `[lon, lat]`, SRID 4326.
- Every number the user sees is traceable to an `Evidence` object carrying `source`, `fetched_at`,
  and `status` (`live | cached | archived | unavailable`). Unavailable means unavailable, never a
  placeholder.
- Credentials: only `X-Device-Key` (sensors) and `X-Admin-Key` (admin and jobs) are client-supplied,
  and only on those endpoints. Missing or wrong key: 401 `UNAUTHORIZED` [R-7]. Provider API keys
  never appear in any request, response, log, or trace.
- No auth, users, or pagination anywhere else.

### Error envelope (all non-2xx JSON responses)

```json
{ "error": { "code": "<string>", "message": "<string>", "details": "<object | array | null>" } }
```

FastAPI's default 422 body is overridden with a handler that emits this envelope.

| HTTP | `code` | When |
|---|---|---|
| 422 | `VALIDATION_ERROR` [R-7] | Any request validation failure (schema or business rule) |
| 404 | `NOT_FOUND` | Unknown field, assessment, admin source, or route |
| 405 | `METHOD_NOT_ALLOWED` [B-23] | The route exists but not for that HTTP method |
| 401 | `UNAUTHORIZED` [R-7] | Missing/wrong `X-Device-Key`, `X-Admin-Key`, or Telegram secret |
| 429 | `RATE_LIMITED` [B-22] | A client exceeded a write-route limit; the response carries `Retry-After` (seconds) |
| 503 | `UPSTREAM_UNAVAILABLE` [R-7] | A required upstream outage with no fallback or cache, or the database cannot be reached |
| 500 | `INTERNAL_ERROR` [R-7, B-23] | Unhandled server error (fixed message; the exception text is never echoed) |

For 422, `details` is `[{ "field": "<dotted path>", "reason": "<human-readable>" }]` [R-7].
`GET /health` is the one exception: its 503 returns the health body, not this envelope [R-7].

## Shared types

### SourceName (enum, defined once, reused everywhere)

```
planetary_computer_s2   planetary_computer_s1   sentinel_hub
open_meteo_ensemble     open_meteo_forecast     open_meteo_archive
open_meteo_single_runs
imd_gridded             imd_api                 nasa_power
bhuvan                  gemini                  groq
crida_plans             esp32_sensor            nominatim
```
16 values (B-15). `open_meteo_historical_forecast` was removed: that API stitches the first hours
of every model run into one series, so replaying it as a 15-day forecast leaks observed weather
into the past. Time Machine uses `open_meteo_single_runs` (the run actually issued on the date).
Used in `Evidence.source`, `Source.name`, `data_freshness.per_source` keys, `/health` `sources`
keys, admin `{source}` path params, and the CHECK constraints on `observations.source`,
`api_cache.source`, and `source_switches.source`.

### Evidence

```json
{
  "id": "<string, unique within the assessment>",
  "variable": "<string>",
  "value": "<number | null>",
  "unit": "<string | null>",
  "source": "<SourceName>",
  "source_url": "<string | null>",
  "fetched_at": "<ISO 8601 UTC>",
  "status": "<live | cached | archived | unavailable>"
}
```
- Required: `id`, `variable`, `source`, `fetched_at`, `status`. `unit` and `source_url` nullable.
- `value` is a number, or `null` when `status` is `unavailable`. For a time series, `value` is
  omitted and replaced by `"series": [{ "ts": "<ISO 8601 UTC>", "value": "<number>" }]`.
- For `unavailable`, `fetched_at` is the time of the failed attempt [R-7].
- Evidence `id` format and the `variable` vocabulary: [R-2].
- Cached values are displayed "as of <fetched_at>".

### Risk

```json
{
  "hazard": "<dry_spell | heavy_rain | harvest_rain>",
  "probability": "<number 0..1 | null>",
  "probability_ci90": "<[number, number] | null>",
  "climatology_probability": "<number 0..1 | null>",
  "severity": "<low | moderate | high | severe | unknown>",
  "threshold": { "description": "<string>", "value": "<number>", "unit": "<string>" },
  "horizon_days": "<integer>",
  "crop_stage": "<string>",
  "stage_weight": "<number>",
  "method": "<ensemble | multi_model | deterministic_replay | model | climatology>",
  "members": {
    "ecmwf": "<{ total: integer, exceeding: integer } | null>",
    "gfs":   "<{ total: integer, exceeding: integer } | null>"
  },
  "driver_ids": ["<Evidence.id>"],
  "explanation": ["<string>"],
  "window": { "start": "<YYYY-MM-DD>", "end": "<YYYY-MM-DD>" },
  "uncertainty_note": "<string | null>"
}
```
See rulings B-3 (members, severity, thresholds) and B-16 (method values, explanation).
`members` inner shape is [R-3]; `null` in `deterministic_replay`. `crop_stage` vocabulary [R-2].
`probability` is `null` when it cannot be computed; severity in that case [R-3]. Heavy rain has two
criteria in the runbook but one `threshold` object: [R-3].

### PlanAction

```json
{
  "id": "<string>",
  "when": "<YYYY-MM-DD>",
  "text": "<string>",
  "language": "<en | hi | pa>",
  "citation": {
    "chunk_id": "<uuid, doc_chunks.id>",
    "doc_title": "<string>",
    "page": "<integer>",
    "plan_year": "<integer>"
  },
  "numbers_used": ["<number>"]
}
```
`citation` is required on every action. `id` type and `numbers_used` element type: [R-5].

### Source and data_freshness

```json
{ "name": "<SourceName>", "url": "<string | null>", "status": "<live | cached | archived | unavailable>",
  "fetched_at": "<ISO 8601 UTC>", "attribution": "<string>" }
```
```json
{ "oldest_fetched_at": "<ISO 8601 UTC | null>", "newest_fetched_at": "<ISO 8601 UTC | null>",
  "per_source": { "<SourceName>": { "fetched_at": "<ISO 8601 UTC>", "status": "<live | cached | archived | unavailable>" } } }
```
`Source.status` reuses the Evidence status enum and `url` is nullable [R-7].

## REST endpoints

### GET /api/districts
Fixed list of the two demo districts. 200:
```json
[ { "code": "<string>", "name": "<string>", "bbox": ["<min_lon>", "<min_lat>", "<max_lon>", "<max_lat>"] } ]
```
Exactly two items, the demo districts:

| `name` | State | CRIDA plan file (in `data/`) | Plan date | `plan_year` |
|---|---|---|---|---|
| Ludhiana | Punjab | `PUNJAB 5-Ludhiana 30.04.2011.pdf` | 30.04.2011 | 2011 |
| Dharwad | Karnataka | `KA7-Dharwad 3.2.2011.pdf` | 3.2.2011 | 2011 |

The `code` values, the `bbox` values and their official source, and these field names are [R-1].
The plans' own text gives only these location facts: Ludhiana, district headquarters at
30°54'20.87"N 75°50'45.35"E (a point, not a box); Dharwad, "15°15' to 15°35' N, 75°00' to 75°20' E"
(a coarse range written in the plan). Neither is an official district boundary, so neither is used
as `bbox` until you confirm.

### POST /api/fields
Register a field.

Request:
```json
{
  "name": "<string, optional>",
  "geometry": "<GeoJSON Polygon>",
  "crop": "<wheat | rice | cotton | soybean>",
  "sowing_date": "<YYYY-MM-DD>",
  "district_code": "<code from GET /api/districts>"
}
```
Required: `geometry`, `crop`, `sowing_date`, `district_code`. 422 `VALIDATION_ERROR` if: polygon
invalid or self-intersecting; area over 50 ha; `district_code` not in the district list;
polygon centroid outside that district's `bbox`; `sowing_date` in the future; `crop` not in the enum.
The server generates `id` and `short_code`.

Response **201** (the created field):
```json
{ "id": "<uuid>", "short_code": "<6 chars [A-Z0-9]>", "name": "<string | null>",
  "geometry": "<GeoJSON Polygon>", "crop": "<crop>", "sowing_date": "<YYYY-MM-DD>",
  "district_code": "<string>", "created_at": "<ISO 8601 UTC>" }
```

### GET /api/fields
Query: optional `district_code`. Returns **all** fields, newest first (`created_at DESC`), capped
at 200, as an array of the Field object above. No pagination, no auth. An unknown `district_code`
filter returns 422 [R-7].

### POST /api/assessments
Request:
```json
{ "field_id": "<uuid>", "as_of": "<YYYY-MM-DD, optional>", "language": "<en | hi | pa, optional>" }
```
- `as_of`: range 2021-01-01 to today (UTC [R-10]); omitted or `null` = live, stored as NULL;
  a future date is 422.
- `language`: default `en`.
- Unknown `field_id`: 404 `NOT_FOUND`.

Response **202**:
```json
{ "assessment_id": "<uuid>", "status": "queued",
  "stream_url": "/api/assessments/<assessment_id>/stream",
  "result_url": "/api/assessments/<assessment_id>" }
```
URLs are relative paths [R-7].

### GET /api/assessments/{id}
Response **200**:
```json
{
  "id": "<uuid>",
  "field_id": "<uuid>",
  "status": "<queued | running | completed | completed_degraded | failed>",
  "mode": "<live | replay>",
  "as_of": "<YYYY-MM-DD | null>",
  "language": "<en | hi | pa>",
  "model_version": "<string | null>",
  "created_at": "<ISO 8601 UTC>",
  "completed_at": "<ISO 8601 UTC | null>",
  "risks": ["<Risk>"],
  "evidence": ["<Evidence>"],
  "plan": ["<PlanAction>"],
  "plan_summary": "<string | null>",
  "plan_generator": "<llm | rule_based | none | null>",
  "replay_basis": "<archived_forecast | observed_rain_model | null>",
  "sources": ["<Source>"],
  "data_freshness": "<data_freshness>"
}
```
- `mode` is `replay` iff `as_of` is not null.
- **While `queued` or `running`: 200 with `risks`, `evidence`, `plan`, `sources` all `[]`,
  `completed_at: null`, and `data_freshness` = `{ "oldest_fetched_at": null,
  "newest_fetched_at": null, "per_source": {} }`. Never 404.**
- `completed_degraded` = finished with a fallback source, unavailable input, or rule-based plan
  [R-11]. `failed` = no usable card.
- Unknown id (including a non-UUID id): 404 `NOT_FOUND` [R-7].

### GET /api/assessments/{id}/stream
`Content-Type: text/event-stream`. See "SSE events". Unknown id: 404 `NOT_FOUND` as JSON before
the stream opens.

### POST /api/sensors/ingest
*(P1, only if hardware exists.)* Header `X-Device-Key: <key>`.

Request:
```json
{ "device_id": "<string>", "soil_moisture_pct": "<number>", "temp_c": "<number>",
  "rh_pct": "<number>", "ts": "<ISO 8601 UTC>" }
```
Response **202** `{ "received": true }`. Wrong key: **401**. The key is verified by hashing it
(SHA-256 hex [R-7]) and comparing with `sensor_devices.key_hash` for `device_id`; an unknown
`device_id` is also 401. The reading is stored with the device's `field_id`.

### POST /api/telegram/webhook
Body: Telegram Bot API `Update` object. Verified by header `X-Telegram-Bot-Api-Secret-Token`
equal to the configured secret; mismatch 401 [R-9]. Response **200** `{ "ok": true }`.
`/start <short_code>` looks up `fields.short_code` and inserts an `alert_subscriptions` row
(`language` default `en`, `active` true); re-sending is idempotent [R-8]. Bot reply texts: [R-9].

### POST /api/jobs/monitor
Header `X-Admin-Key`. Optional body `{ "field_ids": ["<uuid>"] }` restricting the run. Response
**200**:
```json
{ "checked": "<integer>", "alerted": "<integer>", "skipped": "<integer>", "errors": "<integer>" }
```
Value types and exact counting [R-8]. Rules:
- A field is **monitored** iff it has at least one `alert_subscriptions` row with `active = true`.
- Each monitored field is re-assessed live.
- **Alert** when any hazard `probability >= 0.5`, or a hazard's `severity` rose a band since the
  last run. Baseline for "last run": [R-8].
- **Never repeat** the same `hazard` + `severity` to the same chat within 24 h (checked against
  `alerts_sent`).
- Alert text is sent in the subscription's `language`.

### GET /health
No `/api` prefix. Response **200** when `ok` or `degraded`; **503 only if the database is down**.
```json
{
  "status": "<ok | degraded>",
  "version": "<string>",
  "model_version": "<string | null>",
  "db": { "status": "<ok | down>", "latency_ms": "<integer | null>" },
  "sources": {
    "<SourceName>": { "status": "<ok | degraded | down | unknown>", "last_latency_ms": "<integer | null>",
                      "last_ok_at": "<ISO 8601 UTC | null>", "disabled": "<boolean>" }
  },
  "latency": { "p50_ms": "<integer | null>", "p95_ms": "<integer | null>" }
}
```
Source `status` values and the `latency` window (runbook: last 10 runs) are [R-7]. `status` is
`degraded` if any source is not `ok` or is disabled. When the DB is down the top-level status is
`degraded` with HTTP 503 [R-7].

### GET /api/admin/sources
Header `X-Admin-Key`. 200: an array with one item per `SourceName`:
```json
[ { "source": "<SourceName>", "disabled": "<boolean>", "updated_at": "<ISO 8601 UTC | null>" } ]
```
Item shape [R-7].

### POST /api/admin/sources/{source}/disable and /enable
Header `X-Admin-Key`, no body. `{source}` is a `SourceName`; otherwise 404 `NOT_FOUND` [R-7].
Response **200**: the single item shape above. State persists in `source_switches`. While a source
is disabled its connector makes no upstream call [B-25]: it serves the last real cached response
with `status: "cached"` and a `note` saying the admin switched the source off; when nothing is
cached it reports the source `unavailable` and the agent falls back to the next source in its chain.

## SSE events

`GET /api/assessments/{id}/stream`. One-way.

Frame:
```
id: <seq>
event: <event name>
data: <envelope JSON>

```
Envelope:
```json
{ "seq": "<integer>", "ts": "<ISO 8601 UTC>", "event": "<event name>",
  "assessment_id": "<uuid>", "node": "<string | null>", "data": "<object>" }
```
- **Heartbeat:** an SSE comment line `: keep-alive` every 15 s.
- **Reconnect:** client sends `Last-Event-ID: <seq>`; the server replays stored `agent_steps` with
  `seq` greater than that, then continues live. A new connection with no header replays from the
  start. A finished assessment replays, emits `done`, and closes.
- Every event is also stored as an `agent_steps` row (the trace); how `event` is recovered on
  replay: [R-4].

| Event | Emitted when | `data` |
|---|---|---|
| `node_started` | A graph node begins | StepData |
| `tool_result` | A connector/tool returns | StepData; `detail`: `{ "source": "<SourceName>", "evidence_ids": ["<id>"] }` [R-4] |
| `gate_failed` | Quality gate fails | StepData; `detail`: `{ "check": "<cloud\|staleness\|gaps>", "reason": "<string>" }` [R-4] |
| `fallback_used` | Source switched | StepData; `detail`: `{ "from_source": "<SourceName>", "to_source": "<SourceName>", "reason": "<string>" }` [R-4] |
| `verifier_rejected` | Draft rejected | StepData; `detail`: `{ "attempt": "<integer>", "item": "<string>", "reason": "<string>" }` [R-4] |
| `error` | The run hit an unrecoverable error | `{ "code": "<string>", "message": "<string>" }` [R-4] |
| `done` | Run finished (always last) | `{ "status": "<completed \| completed_degraded \| failed>", "result_url": "<string>", "duration_ms": "<integer>", "degraded": "<boolean>" }` |

StepData mirrors the `agent_steps` columns:
```json
{ "tool": "<string | null>", "status": "<started | succeeded | failed | retried | skipped>",
  "latency_ms": "<integer | null>", "detail": "<object>" }
```
After an `error` event a `done` with `status: "failed"` always follows [R-4]. `degraded` is true iff
`status` is `completed_degraded`.

## Database tables

PostgreSQL 16 with PostGIS and pgvector; extensions `postgis`, `vector` enabled in the first
migration. All columns `NOT NULL` unless marked `NULL`. Enums are `text` with CHECK constraints.
`<SourceCheck>` = `CHECK (source IN (...the 14 SourceName values...))`.
Entries marked *(new)* are additions to the section F column lists, required by the decisions.

### fields
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| short_code *(new)* | text | UNIQUE, CHECK (short_code ~ '^[A-Z0-9]{6}$'), server-generated |
| name | text NULL | [R-7] |
| geom | geometry(Polygon, 4326) | GiST index |
| crop | text | CHECK (crop IN ('wheat','rice','cotton','soybean')) |
| sowing_date | date | |
| district_code | text | validated by the API against `GET /api/districts` [R-1] |
| created_at *(new)* | timestamptz | DEFAULT now(); index for newest-first listing |

### observations
| Column | Type | Constraints |
|---|---|---|
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| field_id | uuid | FK fields(id) ON DELETE CASCADE [R-7] |
| source | text | `<SourceCheck>` |
| variable | text | [R-2] |
| ts | timestamptz | |
| value | double precision | |
| unit *(new)* | text NULL | |
| fetched_at | timestamptz | |

Index on (field_id, variable, ts).

### api_cache
| Column | Type | Constraints |
|---|---|---|
| key | text | PK (source + request hash) |
| source | text | `<SourceCheck>` |
| response | jsonb | |
| fetched_at | timestamptz | |
| expires_at | timestamptz | |

### imd_rain_daily
| Column | Type | Constraints |
|---|---|---|
| lat | real | 0.25 degree cell centre |
| lon | real | 0.25 degree cell centre |
| date | date | |
| mm | real | |

PRIMARY KEY (lat, lon, date).

### assessments
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| field_id | uuid | FK fields(id) |
| as_of | date NULL | NULL = live; CHECK (as_of IS NULL OR as_of >= DATE '2021-01-01') |
| mode | not stored | derived: `replay` iff `as_of IS NOT NULL` [R-7] |
| language *(new)* | text | DEFAULT 'en', CHECK (language IN ('en','hi','pa')) |
| status | text | DEFAULT 'queued', CHECK (status IN ('queued','running','completed','completed_degraded','failed')) |
| model_version | text NULL | |
| risks | jsonb | DEFAULT '[]' (array of Risk) |
| evidence *(new)* | jsonb | DEFAULT '[]' (array of Evidence) |
| plan | jsonb | DEFAULT '[]' (array of PlanAction) |
| sources *(new)* | jsonb | DEFAULT '[]' (array of Source) |
| data_freshness *(new)* | jsonb NULL | |
| created_at *(new)* | timestamptz | DEFAULT now() |
| completed_at *(new)* | timestamptz NULL | |

### agent_steps
This table is the trace.
| Column | Type | Constraints |
|---|---|---|
| id *(new)* | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| assessment_id | uuid | FK assessments(id) ON DELETE CASCADE |
| seq | integer | UNIQUE (assessment_id, seq) |
| ts *(new)* | timestamptz | DEFAULT now(); feeds the envelope `ts` [R-4] |
| event *(new, B-4)* | text | CHECK (event IN the seven SSE event names) |
| node | text | |
| tool | text NULL | |
| status | text | CHECK (status IN ('started','succeeded','failed','retried','skipped')) |
| latency_ms | integer NULL | |
| detail | jsonb | DEFAULT '{}' |

### doc_chunks
| Column | Type | Constraints |
|---|---|---|
| id *(new)* | uuid | PK, DEFAULT gen_random_uuid(); this is the citation id |
| district_code | text | |
| scenario | text | value set [R-6] |
| crop | text | value set [R-6] |
| page | integer | |
| text | text | |
| embedding | vector(384) | HNSW index, `vector_cosine_ops` |
| doc_title *(new)* | text | |
| plan_year *(new)* | integer | |
| source_url *(new)* | text | |
| chunk_index *(new)* | integer | |

Index on (district_code, scenario, crop).

### sensor_devices *(new table; P1)*
| Column | Type | Constraints |
|---|---|---|
| device_id | text | PK |
| field_id | uuid | FK fields(id) |
| key_hash | text | SHA-256 hex of the device key [R-7] |

### sensor_readings
| Column | Type | Constraints |
|---|---|---|
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| device_id | text | FK sensor_devices(device_id) |
| field_id | uuid | FK fields(id) |
| ts | timestamptz | reading time from the device |
| soil_moisture_pct | double precision | |
| temp_c | double precision | |
| rh_pct | double precision | |
| received_at | timestamptz | DEFAULT now() |

### alert_subscriptions
| Column | Type | Constraints |
|---|---|---|
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY [R-8] |
| field_id | uuid | FK fields(id) |
| telegram_chat_id | bigint | |
| language | text | DEFAULT 'en', CHECK (language IN ('en','hi','pa')) |
| active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |

UNIQUE (field_id, telegram_chat_id) [R-8].

### alerts_sent
| Column | Type | Constraints |
|---|---|---|
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| subscription_id | bigint | FK alert_subscriptions(id) |
| assessment_id | uuid | FK assessments(id) |
| hazard | text | CHECK (hazard IN ('dry_spell','heavy_rain','harvest_rain')) |
| severity | text | CHECK (severity IN ('low','moderate','high','severe','unknown')) |
| message_hash | text | |
| status | text | CHECK (status IN ('sent','failed')) [R-7] |
| sent_at | timestamptz | DEFAULT now() |

Index on (subscription_id, hazard, severity, sent_at DESC) for the 24 h duplicate check.

### source_switches *(new table)*
| Column | Type | Constraints |
|---|---|---|
| source | text | PK, `<SourceCheck>` |
| disabled | boolean | DEFAULT false |
| updated_at | timestamptz | DEFAULT now() |

A source with no row is enabled [R-7].

## Decisions log

- **Q-1** UUID v4 server-generated ids for fields, assessments (and doc_chunks); bigint identity for observations, agent_steps, sensor_readings, alerts_sent; api_cache.key is text.
- **Q-2** timestamptz UTC; sowing_date/as_of are date; doubles for values; text + CHECK for enums; jsonb payloads; geometry(Polygon,4326); vector(384). Exact types listed per column above.
- **Q-3** Error envelope `{error:{code,message,details}}`; 422 validation (FastAPI default overridden), 404 `NOT_FOUND`, 503 upstream outage; `POST /api/fields` returns 201.
- **Q-4** Crop enum is exactly wheat, rice, cotton, soybean.
- **Q-5** Client sends `district_code` from a fixed two-district list (`GET /api/districts`); server checks centroid inside the district bbox else 422; no village-search endpoint, browser calls Nominatim directly.
- **Q-6** `GET /api/fields`: all fields newest first, cap 200, optional `?district_code=`, no pagination, no auth.
- **Q-7** `as_of` is a date, 2021-01-01..today, omitted/null = live (stored NULL), future = 422.
- **Q-8** Language is `en|hi|pa`, default `en`.
- **Q-9** `POST /api/assessments` returns 202 `{assessment_id,status,stream_url,result_url}`; `GET` returns the full card with five status values; running returns 200 with empty arrays, never 404.
- **Q-10** Risk shape fixed as specified (hazard, probability, severity, threshold, horizon_days, crop_stage, stage_weight, method, members, driver_ids, uncertainty_note).
- **Q-11** Evidence `{id,variable,value,unit,source,source_url,fetched_at,status}`; required id/variable/source/fetched_at/status; value number or null; series replaces value for time series.
- **Q-12** PlanAction `{id,when,text,language,citation{chunk_id,doc_title,page,plan_year},numbers_used[]}`; citation required.
- **Q-13** Source `{name,url,status,fetched_at,attribution}`; data_freshness `{oldest_fetched_at,newest_fetched_at,per_source}`.
- **Q-14** Source names are the 14-value `SourceName` enum, defined once.
- **Q-15** P1 sensor ingest: `X-Device-Key`, 202 `{received:true}`, 401 on bad key; new `sensor_devices`; `sensor_readings` columns as specified.
- **Q-16** Webhook `POST /api/telegram/webhook` returns 200 `{ok:true}`; `fields.short_code` is a unique 6-char uppercase alphanumeric; `alert_subscriptions` columns as specified.
- **Q-17** `POST /api/jobs/monitor` returns `{checked,alerted,skipped,errors}`; monitored = active subscription; alert at probability >= 0.5 or severity up a band; 24 h hazard+severity dedupe per chat; `alerts_sent` columns as specified.
- **Q-18** `GET /health` (no prefix) shape as specified; 200 when degraded, 503 only if DB down.
- **Q-19** `GET /api/admin/sources`, `POST /api/admin/sources/{source}/disable|enable`, `X-Admin-Key`, state in `source_switches`; disabled source reports unavailable and triggers fallback.
- **Q-20** SSE envelope `{seq,ts,event,assessment_id,node,data}`; seven events incl. `error`; 15 s heartbeat; `Last-Event-ID` replay from `agent_steps`; `done` carries `{status,result_url,duration_ms,degraded}`; step statuses started/succeeded/failed/retried/skipped.
- **Q-21** `observations.unit` text column added.
- **Q-22** `imd_rain_daily(lat real, lon real, date, mm real)`, PK (lat, lon, date).
- **Q-23** `doc_chunks` gains `doc_title`, `plan_year`, `source_url`, `chunk_index`; the citation id is the chunk's UUID `id`.

## Additions made by the build rulings

### GET /api/geocode?q=<text> (B-12, closes C-1)
Village/place search proxied through the `nominatim` connector (cached 30 days). 200:
`[ { "name": "<string>", "lat": "<number>", "lon": "<number>", "district": "<string | null>" } ]`, at
most 5, India only. Upstream down with no cache: 503 `UPSTREAM_UNAVAILABLE`.

### GET /api/model (B-17)
The dry-spell model card exactly as `scripts/train_dryspell.py` wrote it, or
`{ "status": "not_trained" }`.

### GET /api/districts additions (B-1)
Each item also carries `"state": "<string>"`, `"plan_title": "<string>"`, `"plan_year": "<integer>"`,
`"plan_chunks": "<integer>"` (indexed passages) and `"bbox_source": "<SourceName>"`.
`bbox` is `null` when the boundary lookup is unavailable and nothing is cached.

### Table assessments additions
`plan_summary text NULL`, `plan_generator text NULL CHECK (plan_generator IN ('llm','rule_based','none'))`,
`replay_basis text NULL CHECK (replay_basis IN ('archived_forecast','observed_rain_model'))`, `error text NULL`.

### Table source_health (new, B-7)
| Column | Type | Constraints |
|---|---|---|
| source | text | PK, `<SourceCheck>` |
| last_ok_at | timestamptz NULL | |
| last_error_at | timestamptz NULL | |
| last_error | text NULL | |
| last_latency_ms | integer NULL | |

### Table imd_cells (new, B-18)
`lat real, lon real, PRIMARY KEY (lat, lon)`: one row per loaded IMD grid cell, for nearest-cell lookup.

## Rulings (build) — every former conflict and remaining question, decided

- **B-1 (R-1) Districts.** Codes `PB_LUDHIANA` and `KA_DHARWAD` (state ISO 3166-2:IN suffix + name).
  The list lives in `apps/api/app/districts.py` (code, name, state, plan file, plan year). `bbox` is
  fetched from OpenStreetMap Nominatim's district boundary (`nominatim`, cached one year) and shown
  with its source; no hand-typed coordinates. Replace with an official LGD/Survey of India boundary
  if the team obtains one.
- **B-2 (C-2) "Any point in India".** Field validation keeps the district check. The demo step
  becomes: a judge picks any point; inside a demo district it is assessed, outside it the 422
  reason names the two districts whose plans are indexed. India-wide bounds are checked first so
  the reason is specific. `bhuvan` stays in the enum, unused.
- **B-3 (R-3, C-9) Risk detail.** `members.ecmwf` / `members.gfs` = `{ "total": int, "exceeding": int }`
  or `null`. Events: dry_spell = >= 10 consecutive days < 2.5 mm (IMD rainy-day threshold);
  heavy_rain = any day >= 20 mm OR any 3-day total >= 50 mm (runbook criteria; `threshold.value` = 20,
  `unit` = "mm/day", `description` names both); harvest_rain (ripening days only) = any day >= 15.6 mm
  OR 3-day total >= 25 mm. Severity score = probability x stage_weight; bands low < 0.2 <= moderate
  < 0.45 <= high < 0.7 <= severe. Probability `null` => severity `unknown`.
- **B-4 (R-4) Trace mapping.** `agent_steps.event` stores the SSE event name. `done` uses node
  `finalize`, `error` uses node `agent`. Default step status per event: node_started=started,
  tool_result=succeeded|failed, gate_failed=failed, fallback_used=retried, verifier_rejected=failed,
  done=succeeded, error=failed. `gate_failed.detail.check` adds `"error"` (source call failed). One
  `verifier_rejected` per problem found. `done` always follows `error`.
- **B-5 (R-5, C-10) Plan.** `PlanAction.id` = `"a1"`, `"a2"`, ...; `numbers_used` = numbers. The summary is
  `plan_summary` on the assessment. Plans are cached in `api_cache` (source `gemini`/`groq`) by
  sha256 of the prompt for 6 h.
- **B-6 (R-6) doc_chunks.** `scenario` CHECK in (early_drought, early_dry_spell, mid_drought,
  terminal_drought, excess_rain, unseasonal_rain, heat_cold_hail, pest_disease, general). `crop` is
  free text, NULL = applies to all crops (CRIDA plans cover more crops than the field enum).
- **B-7 (R-7) Small gaps.** All provisional values written above are accepted as-is. Source
  health is kept in the new `source_health` table; `/health` source status = `ok` (last call ok),
  `degraded` (last call failed but cache served), `down` (last call failed), `unknown` (never
  called); latency window = last 10 completed assessments.
- **B-8 (R-8) Monitoring.** `checked` = monitored fields re-assessed; `alerted` = messages sent;
  `skipped` = fields with no alert due; `errors` = failed assessments or sends. Baseline for
  "severity rose a band" = the field's previous completed live assessment. The re-assessment
  runs in English; the alert is formatted in each subscription's language.
- **B-9 (R-9) Telegram.** Replies: success "Subscribed to alerts for <field>." + Hindi line;
  unknown code "Field code not found." + Hindi line; no code: usage text. Bad secret: 401.
- **B-10 (R-10) as_of.** "today" = server UTC date. `as_of` = today is treated as live (stored
  NULL). Past dates >= 2024-03-14 replay the archived ECMWF IFS run issued that day
  (`replay_basis = archived_forecast`, method `deterministic_replay`, YES/NO not a probability);
  earlier dates use the LightGBM model on observed IMD rain (`replay_basis = observed_rain_model`).
- **B-11 (R-11) Degraded.** `completed_degraded` iff any fallback was used, any evidence is
  `unavailable`, or the plan is rule-based or empty. `model_version` is null until completion.
- **B-12 (C-1) Geocoding.** The browser no longer calls Nominatim: `GET /api/geocode` above. Map
  tiles are a display basemap, not a data source, and stay client-side (attributed in the UI).
- **B-13 (C-3)** Seven SSE events, including `error`, are final.
- **B-14 (C-4)** `/health` is the one non-envelope response, as written.
- **B-15 (C-7)** `groq` and `nominatim` added to SourceName.
- **B-16 (C-5)** Risk numbers trace to evidence via `driver_ids`; each risk also carries
  `explanation` strings built only from those evidence values, and the verifier checks plan
  numbers against both.
- **B-17 (C-6)** The kill switch is `source_switches` only (no env var).
- **B-18 (C-8)** All added tables and columns are listed above and in `apps/api/alembic/versions`.
- **B-19** Crops stay wheat, rice, cotton, soybean. Stage sensitivities come from FAO-33 (wheat,
  cotton, soybean) and are marked team-set for rice.
- **B-20** Runtime DB access is plain SQL through asyncpg; SQLAlchemy + Alembic are used for
  migrations only (keeps every query readable in Q&A).
- **B-21** PDF text is extracted with PyMuPDF (pypdf garbles the Dharwad plan's font encoding:
  spaces come out as "m", hyphens as "D").
- **B-22 Rate limits.** The demo path has no login and every assessment spends free-tier quota, so
  the routes that start work are limited per client address with an in-memory sliding window of
  60 s: `POST /api/assessments` 10, `POST /api/fields` 20, and the `X-Admin-Key` routes
  (`GET /api/admin/sources`, `POST /api/admin/sources/{source}/disable|enable`, `POST
  /api/jobs/monitor`) 30, counted even when the key is wrong, which slows key guessing. Over the
  limit the API answers **429** `RATE_LIMITED` with a `Retry-After` header. The window is per
  process; behind Cloud Run the client address comes from `X-Forwarded-For`. Reads, the SSE
  stream, `/health`, the Telegram webhook (secret-checked) and sensor ingest (device-keyed) are
  not limited.
- **B-23 Error mapping.** An unhandled exception returns **500** `INTERNAL_ERROR` with a fixed
  message; the log records the exception type and route, never its text (it can contain a URL with
  a token). A lost database connection (`asyncpg` connection errors) returns **503**
  `UPSTREAM_UNAVAILABLE`, not 500. A wrong method on an existing route returns **405**
  `METHOD_NOT_ALLOWED`. `POST /api/assessments` validates `as_of` (422) before it reads the
  database, so a malformed request never depends on it.
- **B-24 Archive, replay and ensemble data (checked live, 2026-11-01).** Archive API requests use
  `models=era5_seamless`: rain comes from ERA5 and soil moisture from ERA5-Land, identical to the
  `era5_land` values over the 10-year soil climatology window; `era5_land` alone returns no
  precipitation, which left every replay without "what actually fell" and forced the NASA POWER
  fallback. Single Runs replays group hourly values into **UTC** days, because a 00 UTC run starts
  at 05:30 IST and IST days left only nine usable days (so a 10-day dry spell could never be seen,
  and the first day's rain was dropped). A dry-spell count leaves out members with fewer than 10
  valid days (the multi-model fallback includes models that stop at 7 or 9 days) and says so in
  `explanation`. Ensemble requests use the id Open-Meteo documents, `ecmwf_ifs025_ensemble`
  (the older `ecmwf_ifs025` still answers with identical numbers) and `ncep_gefs025`.
- **B-25 Kill switch.** Supersedes the "reports unavailable" wording of Q-19: a disabled source
  serves its last real cached response, flagged `cached` with a note, and only reports
  `unavailable` (triggering the fallback chain) when it has nothing cached. A disabled
  `sentinel_hub` does not request an OAuth token.
