"""Multilingual sentence embeddings on CPU via fastembed (ONNX runtime, no torch), 384 dims.

For offline scripts only (plan ingestion, query vectors): loading the model takes more memory than
the API has, so the API reads precomputed vectors from `app/rag/query_vectors.py` instead.
"""

from functools import lru_cache
from typing import Any

import numpy as np

from app.config import get_settings


@lru_cache(maxsize=1)
def _model() -> Any:
    from fastembed import TextEmbedding

    return TextEmbedding(
        get_settings().embed_model,
        threads=1,
        enable_cpu_mem_arena=False,
    )


def embed(texts: list[str]) -> list[np.ndarray[Any, Any]]:
    return [np.asarray(v, dtype=np.float32) for v in _model().embed(texts)]
