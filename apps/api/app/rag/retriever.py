"""Hybrid retrieval over CRIDA plan chunks.

Metadata filters (district + scenario + crop) do most of the work because each district's corpus
is small. Inside the filter, cosine-distance rank and Postgres full-text rank are fused by
reciprocal rank fusion, which keeps exact crop and variety names that embeddings blur.
"""

from typing import Any

from app import db
from app.rag.query_vectors import lookup

SQL = """
WITH cand AS (
  SELECT id, doc_title, plan_year, source_url, page, scenario, crop, text,
         embedding <=> $1 AS dist,
         ts_rank(to_tsvector('simple', text), plainto_tsquery('simple', $5)) AS kw
  FROM doc_chunks
  WHERE district_code = $2 AND scenario = ANY($3::text[]) AND (crop IS NULL OR crop ILIKE $4)
),
ranked AS (
  SELECT *, RANK() OVER (ORDER BY dist) AS rv, RANK() OVER (ORDER BY kw DESC) AS rk FROM cand
)
SELECT id::text AS id, doc_title, plan_year, source_url, page, scenario, crop, text,
       (1.0 / (60 + rv) + 1.0 / (60 + rk)) AS score
FROM ranked ORDER BY score DESC LIMIT $6
"""

SQL_KEYWORD = """
WITH cand AS (
  SELECT id, doc_title, plan_year, source_url, page, scenario, crop, text,
         ts_rank(to_tsvector('simple', text), plainto_tsquery('simple', $4)) AS kw
  FROM doc_chunks
  WHERE district_code = $1 AND scenario = ANY($2::text[]) AND (crop IS NULL OR crop ILIKE $3)
)
SELECT id::text AS id, doc_title, plan_year, source_url, page, scenario, crop, text,
       (1.0 / (60 + RANK() OVER (ORDER BY kw DESC))) AS score
FROM cand ORDER BY score DESC LIMIT $5
"""


async def retrieve(
    district_code: str, scenarios: list[str], crop: str, query: str, k: int = 4
) -> list[dict[str, Any]]:
    vec = lookup(query)
    if vec is not None:
        rows = await db.pool().fetch(SQL, vec, district_code, scenarios, f"%{crop}%", query, k)
        if not rows:  # still give cited guidance from the district's general sections
            rows = await db.pool().fetch(
                SQL, vec, district_code, ["general", *scenarios], f"%{crop}%", query, k
            )
    else:  # no precomputed vector for this query: full-text rank alone
        rows = await db.pool().fetch(SQL_KEYWORD, district_code, scenarios, f"%{crop}%", query, k)
        if not rows:
            rows = await db.pool().fetch(
                SQL_KEYWORD, district_code, ["general", *scenarios], f"%{crop}%", query, k
            )
    return [dict(r) | {"score": float(r["score"])} for r in rows]


async def chunk_counts() -> dict[str, int]:
    rows = await db.pool().fetch(
        "SELECT district_code, count(*) AS n FROM doc_chunks GROUP BY district_code"
    )
    return {str(r["district_code"]): int(r["n"]) for r in rows}
