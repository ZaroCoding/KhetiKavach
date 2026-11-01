"""Embed every retrieval query the agent can ask; run at image build (see apps/api/Dockerfile).

Usage: uv run python -m scripts.build_query_vectors
"""

from pathlib import Path

import numpy as np

from app.config import get_settings
from app.rag.embed import embed
from app.rag.query_vectors import all_queries


def main() -> None:
    settings = get_settings()
    queries = all_queries()
    path = Path(settings.query_vectors_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        path,
        model=np.array(settings.embed_model),
        queries=np.array(queries),
        vectors=np.stack(embed(queries)),
    )
    print(f"wrote {len(queries)} query vectors to {path}")


if __name__ == "__main__":
    main()
