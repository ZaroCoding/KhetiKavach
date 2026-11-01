`scripts/train_dryspell.py` writes `dryspell_lgbm.joblib` and `dryspell_metrics.json` here.
Commit both after training so the image ships the exact model whose metrics `/api/model` serves.
Until then the API reports `model_version: null` and pre-2024 Time Machine runs fall back to
IMD climatology for every hazard.
