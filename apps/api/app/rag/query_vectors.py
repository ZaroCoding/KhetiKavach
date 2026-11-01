"""Query embeddings computed when the image is built, so the API never loads the ONNX model.

Loading the embedding model took the process from 118 MB to 718 MB (measured 2026-11-02), and the
API runs in 512 MB: the first retrieval got the server killed mid-run. The agent's queries come
from a closed set (crop x hazard x stages), so `scripts/build_query_vectors.py` embeds all of them
with the same model that embedded the plan chunks. Vectors are model output, not hand-written
values. A query outside the file returns None and the retriever uses full-text search.
"""

import logging
from collections.abc import Iterator
from functools import lru_cache
from itertools import combinations
from pathlib import Path
from typing import Any

import numpy as np

from app.config import get_settings
from app.risk.crops import CROPS, STAGE_NAMES

log = logging.getLogger("query_vectors")

HAZARDS = ("dry_spell", "heavy_rain", "harvest_rain")
OUTSIDE_SEASON = ("pre_sowing", "past_maturity")


def query_text(crop: str, hazard: str, crop_stage: str) -> str:
    """The retrieval query for one risk. The agent and the build script must agree on this text."""
    return f"{crop} {hazard.replace('_', ' ')} {crop_stage} contingency measures"


def _stage_labels() -> Iterator[str]:
    """Every value a Risk's crop_stage can take: any stages in crop order, joined, or a status."""
    yield from OUTSIDE_SEASON
    yield ""  # no stage falls inside the forecast window
    for size in range(1, len(STAGE_NAMES) + 1):
        for stages in combinations(STAGE_NAMES, size):
            yield ", ".join(stages)


def all_queries() -> list[str]:
    return [
        query_text(crop, hazard, label)
        for crop in CROPS
        for hazard in HAZARDS
        for label in _stage_labels()
    ]


@lru_cache(maxsize=1)
def _table() -> dict[str, np.ndarray[Any, Any]]:
    settings = get_settings()
    path = Path(settings.query_vectors_path)
    if not path.exists():
        log.warning("%s is missing: retrieval will use full-text search only", path)
        return {}
    with np.load(path, allow_pickle=False) as data:
        if str(data["model"]) != settings.embed_model:
            log.warning("%s was built with another model: ignoring it", path)
            return {}
        return {str(q): v for q, v in zip(data["queries"], data["vectors"], strict=True)}


def lookup(query: str) -> np.ndarray[Any, Any] | None:
    return _table().get(query)
