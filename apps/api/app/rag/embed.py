"""Multilingual sentence embeddings on CPU via fastembed (ONNX runtime, no torch), 384 dims.

The model downloads on first use; the API Dockerfile bakes it into the image so a cold start
never fetches it during the demo.
"""

from functools import lru_cache
from typing import Any

import numpy as np

from app.config import get_settings


@lru_cache(maxsize=1)
def _model() -> Any:
    from fastembed import TextEmbedding

    return TextEmbedding(get_settings().embed_model)


def embed(texts: list[str]) -> list[np.ndarray[Any, Any]]:
    return [np.asarray(v, dtype=np.float32) for v in _model().embed(texts)]


def embed_one(text: str) -> np.ndarray[Any, Any]:
    return embed([text])[0]
