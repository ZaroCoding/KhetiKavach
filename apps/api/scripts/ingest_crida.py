"""Index a district's ICAR-CRIDA contingency plan (from the repo's data/ folder) into doc_chunks.

    uv run python -m scripts.ingest_crida --district PB_LUDHIANA --url "<public URL of the PDF>"

Text comes from PyMuPDF (ruling B-21). The current scenario is tracked from section headings near
the top of each page; text is chunked per page (~900 characters, 150 overlap); a chunk naming
exactly one crop is tagged with it; chunks are embedded with the same model the API uses.
"""

import argparse
import asyncio
import re
from pathlib import Path

import asyncpg
from pgvector.asyncpg import register_vector

from app import db
from app.districts import DISTRICTS
from app.rag.embed import embed
from app.rag.pdftext import page_texts
from app.rag.scenarios import NON_CROP_SECTION, heading_scenario

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
CROP_WORDS = {
    "wheat": re.compile(r"\bwheat\b", re.I),
    "rice": re.compile(r"\b(rice|paddy)\b", re.I),
    "cotton": re.compile(r"\bcotton\b", re.I),
    "soybean": re.compile(r"\bsoy\s?bean\b", re.I),
    "maize": re.compile(r"\bmaize\b", re.I),
    "groundnut": re.compile(r"\bgroundnut\b", re.I),
    "jowar": re.compile(r"\b(jowar|sorghum)\b", re.I),
    "chickpea": re.compile(r"\b(chickpea|gram|bengal\s?gram)\b", re.I),
}


def chunks(text: str, size: int = 900, overlap: int = 150) -> list[str]:
    text = re.sub(r"[ \t]+", " ", text)
    return [text[i : i + size] for i in range(0, len(text), size - overlap)]


def crop_tag(text: str) -> str | None:
    hits = [c for c, pat in CROP_WORDS.items() if pat.search(text)]
    return hits[0] if len(hits) == 1 else None


async def main(args: argparse.Namespace) -> None:
    info = DISTRICTS[args.district]
    pages = page_texts(DATA_DIR / info.plan_file)
    rows: list[tuple[int, str, str | None, str, int]] = []
    scenario, buffer, buffer_page = "general", "", 1

    def flush() -> None:
        nonlocal buffer
        text = re.sub(r"[ \t]+", " ", buffer).strip()
        if len(text) > 80:
            rows.append((buffer_page, scenario, crop_tag(text), text, len(rows)))
        buffer = ""

    # Walk the plan line by line: a heading line closes the current chunk and switches scenario,
    # so every chunk belongs to exactly one contingency scenario.
    crop_sections = True
    for pno, page in enumerate(pages, 1):
        lines = page.splitlines()
        for k, line in enumerate(lines):
            if NON_CROP_SECTION.match(line.strip()):
                flush()
                scenario, crop_sections = "general", False  # livestock/fisheries: not crop advice
            found = None
            if crop_sections:
                nxt = lines[k + 1].strip() if k + 1 < len(lines) else ""
                found = heading_scenario(line) or (
                    heading_scenario(f"{line.strip()} {nxt}") if len(line.strip()) < 40 else None
                )
            if found and found != scenario:
                flush()
                scenario = found
            if not buffer:
                buffer_page = pno
            buffer += line + "\n"
            if len(buffer) >= 900:
                flush()
    flush()
    if not rows:
        raise SystemExit("no text extracted: is the PDF scanned? run OCR first (ocrmypdf)")
    if args.dry_run:
        summary: dict[str, int] = {}
        for _, s, _, _, _ in rows:
            summary[s] = summary.get(s, 0) + 1
        print(f"dry run: {len(rows)} chunks from {len(pages)} pages for {info.code}")
        for name, n in sorted(summary.items()):
            print(f"  {name:<18} {n}")
        return
    vectors = embed([r[3] for r in rows])
    conn = await asyncpg.connect(db._dsn())
    await register_vector(conn)
    await conn.execute("DELETE FROM doc_chunks WHERE district_code = $1", info.code)
    await conn.executemany(
        """INSERT INTO doc_chunks(district_code, scenario, crop, page, text, embedding, doc_title,
             plan_year, source_url, chunk_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
        [
            (info.code, s, c, p, t, v, info.plan_title, info.plan_year, args.url, i)
            for (p, s, c, t, i), v in zip(rows, vectors, strict=True)
        ],
    )
    counts = await conn.fetch(
        "SELECT scenario, count(*) AS n FROM doc_chunks WHERE district_code = $1 GROUP BY 1",
        info.code,
    )
    await conn.close()
    print(f"indexed {len(rows)} chunks from {len(pages)} pages for {info.code}")
    for c in counts:
        print(f"  {c['scenario']:<18} {c['n']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--district", required=True, choices=sorted(DISTRICTS))
    parser.add_argument("--url", default=None, help="public URL of the PDF, shown in citations")
    parser.add_argument("--dry-run", action="store_true", help="extract and chunk only; no DB")
    asyncio.run(main(parser.parse_args()))
