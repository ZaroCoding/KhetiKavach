# Open questions to answer later

Decisions that are still yours. Each has a recommendation so you can reply "go with the
recommendation". When you decide, update `docs/CONTRACTS.md` (the single source of truth) and
delete the item here.

Last updated: 2026-11-01

## A. Needed before Prompt 2 and Prompt 7

### 1. District code format
`PUNJAB5` (the Ludhiana plan file prefix is "PUNJAB 5", with a space) and `KA7`.
- Question: is the single token `PUNJAB5` the code you want?
- Recommendation: yes, keep `PUNJAB5` and `KA7`. They are CRIDA codes with no spaces, so they are
  safe in URLs, query strings and the database.
- Affects: `GET /api/districts`, `fields.district_code`, `doc_chunks.district_code`.

### 2. `GET /api/geocode` shape (R-12)
Village search, proxied through the backend. Currently specified: `q` required; each result is
`{ display_name, lat, lon }`; India only.
- Questions: how many results at most? Filter to the two pilot districts' bounding boxes?
- Recommendation: cap at 5 results, and filter to results inside either district bbox. Strict
  two-district scope makes results elsewhere useless.
- Affects: `apps/web` field picker (Prompt 7), `nominatim` connector.

### 3. Map tiles and the "no external calls from the frontend" rule
The browser loads satellite basemap tiles directly (runbook Prompt 7, EOX Sentinel-2 cloudless).
CLAUDE.md rule 3 says the frontend never calls an external data source.
- Options: (a) allow tiles as an explicit exception in CLAUDE.md, or (b) proxy tiles through the
  API.
- Recommendation: (a). Tiles are imagery, carry no key and no user data, and proxying them adds
  load and a failure point to the live demo. If you choose it, add the exception to CLAUDE.md
  rule 3 and attribute the tile provider on the map.

### 4. Where the district list lives
The two districts' codes, names, bounding boxes, plan year and DataMeet attribution.
- Options: (a) a generated data file such as `data/districts/districts.json`, produced by a
  script from the DataMeet shapefile, or (b) hand-maintained config.
- Recommendation: (a). The bounding boxes are derived from real boundary data, so a script
  keeps their provenance and attribution (CC BY 2.5 India) reproducible and avoids hand-typed
  numbers.

## B. Everything else still open

The full list is in `docs/CONTRACTS.md`, section "REMAINING QUESTIONS" (R-2 to R-11): the
Evidence `variable` names and `crop_stage` values, the Risk `members` shape and heavy-rain
thresholds, trace/event mapping, plan action `id` and `numbers_used`, `doc_chunks` scenario and
crop value sets, the many small provisional names tagged `[R-7]`, monitoring details, Telegram
reply texts, `as_of` edge cases, and the definition of `completed_degraded`.

Also unresolved from the conflicts list in `CONTRACTS.md` (C-3 to C-10), none of which block
Prompt 2 but each needs a ruling: the extra `error` SSE event, the `/health` 503 body, risk
numbers without their own provenance, the dropped env-var kill switch, no `SourceName` for a
Groq backup, the schema additions beyond STRATEGY, the heavy-rain two-criteria threshold, and the
dropped plan summary field.

## C. Plan documents that now disagree with decisions

- `docs/STRATEGY.md` section J.6 ("a judge picks any point in India") conflicts with the strict
  two-district rule. The demo step must become "a judge picks any point; points outside the two
  districts show the 422 with its reason". STRATEGY.md has not been edited.
