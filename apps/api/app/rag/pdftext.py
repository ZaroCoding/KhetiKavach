"""PDF text extraction for the CRIDA plans (ruling B-21).

PyMuPDF decodes the plans' fonts correctly; pypdf turns the Dharwad plan's spaces into "m" and
hyphens into "D". Scanned pages (no text layer) come back empty: OCR them, never retype.
"""

from pathlib import Path
from typing import Any


def page_texts(path: Path) -> list[str]:
    import pymupdf

    opener: Any = pymupdf.open
    with opener(str(path)) as doc:
        return [str(page.get_text()) for page in doc]
