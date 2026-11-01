FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    FASTEMBED_CACHE_PATH=/opt/fastembed \
    MALLOC_TRIM_THRESHOLD_=100000 \
    MALLOC_ARENA_MAX=2 \
    GDAL_CACHEMAX=32 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    VECLIB_MAXIMUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1

# GDAL / GEOS / PROJ for rasterio, shapely and pyproj
RUN apt-get update && apt-get install -y --no-install-recommends \
        gdal-bin libgdal-dev libgeos-dev libproj-dev build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN useradd --create-home --uid 10001 appuser
WORKDIR /app

COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project

# The embedding model is for build-time and offline scripts: the running API reads precomputed
# query vectors (app/rag/query_vectors.py) because loading the model does not fit in 512 MB.
RUN mkdir -p /opt/fastembed && /app/.venv/bin/python -c \
    "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')" \
    && chown -R appuser:appuser /opt/fastembed

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts
# models/ holds the trained LightGBM bundle and its metrics (scripts/train_dryspell.py)
COPY models ./models
RUN uv sync --frozen --no-dev
RUN /app/.venv/bin/python -m scripts.build_query_vectors
RUN chown -R appuser:appuser /app

USER appuser
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8080
# /health sits at the root (no /api prefix) and answers 503 only when the database is down.
HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-8080}/health" || exit 1
# Apply migrations, then serve with a single worker to fit within 512MB RAM free-tier limit.
# No --limit-concurrency: it counts idle proxy connections and answers overflow with a bare 503
# (no CORS headers), which browsers report as "Failed to fetch". Agent runs are limited in
# app/agent/graph.py instead. Keep-alive outlasts the proxy's, so it never reuses a closed socket.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*' --workers 1 --timeout-keep-alive 75"]
