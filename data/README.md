# Data

Only official open datasets live here or are loaded from here. Nothing is typed in by hand.

| What | Where | Load with (from `apps/api`) |
|---|---|---|
| ICAR-CRIDA contingency plan, Ludhiana (2011) | `PUNJAB 5-Ludhiana 30.04.2011.pdf` | `uv run python -m scripts.ingest_crida --district PB_LUDHIANA --url "<public PDF URL>"` |
| ICAR-CRIDA contingency plan, Dharwad (2011) | `KA7-Dharwad 3.2.2011.pdf` | `uv run python -m scripts.ingest_crida --district KA_DHARWAD --url "<public PDF URL>"` |
| IMD 0.25° gridded daily rainfall, 1951–2023 | downloaded by imdlib into `apps/api/data/imd/` | `uv run --group data python -m scripts.load_imd --district PB_LUDHIANA` (then `KA_DHARWAD`) |

Notes
- `ingest_crida --dry-run` prints chunk counts per scenario without touching the database.
- Text is extracted with PyMuPDF; pypdf garbles the Dharwad plan (spaces become "m").
- The IMD loader takes the district's OpenStreetMap bounding box plus 0.5° padding, so no
  coordinates are hand-typed. The newest IMD year can lag; extend `--end` when it is published.
- After loading IMD for both districts: `uv run python -m scripts.train_dryspell`, then commit
  `apps/api/models/dryspell_lgbm.joblib` and `dryspell_metrics.json`.
- Check with organisers whether open datasets may be downloaded before the build window starts.
