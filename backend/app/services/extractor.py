import logging
import re
from io import BytesIO
from typing import Tuple

import fitz
import pdfplumber

logger = logging.getLogger(__name__)


class PDFExtractionError(Exception):
    """Raised when text cannot be extracted from a PDF file."""


def _combine_pages(pages: list[str]) -> str:
    """Combine extracted pages while preserving page-level spacing."""

    return "\n\n".join(page.strip() for page in pages if page and page.strip()).strip()


def _extract_with_pdfplumber(file_bytes: bytes) -> Tuple[str, int]:
    """Extract text with pdfplumber."""

    with pdfplumber.open(BytesIO(file_bytes)) as document:
        pages = [page.extract_text() or "" for page in document.pages]
    return _combine_pages(pages), len(pages)


def _extract_with_pymupdf(file_bytes: bytes) -> Tuple[str, int]:
    """Extract text with PyMuPDF as a fallback."""

    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        pages = [page.get_text("text") or "" for page in document]
        return _combine_pages(pages), len(pages)
    finally:
        document.close()


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, int, str]:
    """Extract text from a PDF using pdfplumber first and PyMuPDF as fallback."""

    if not file_bytes:
        raise PDFExtractionError("Uploaded file is empty.")

    try:
        text, page_count = _extract_with_pdfplumber(file_bytes)
        if text:
            return text, page_count, "pdfplumber"
        logger.warning("pdfplumber extracted no text; falling back to PyMuPDF.")
    except Exception as error:  # pragma: no cover - defensive API guard
        logger.warning("pdfplumber extraction failed; falling back to PyMuPDF: %s", error)

    try:
        text, page_count = _extract_with_pymupdf(file_bytes)
        if text:
            return text, page_count, "pymupdf"
    except Exception as error:  # pragma: no cover - defensive API guard
        logger.exception("Unable to extract text from uploaded PDF: %s", error)
        raise PDFExtractionError("Unable to extract text from the uploaded PDF.") from error

    raise PDFExtractionError("No extractable text found in the uploaded PDF.")


def clean_extracted_text(text: str) -> str:
    """Normalize extracted PDF text while preserving useful line structure."""

    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n").replace("\x00", " ")
    normalized = re.sub(r"(?<=\w)-\n(?=\w)", "", normalized)
    normalized = re.sub(r"[\t\f\v]+", " ", normalized)

    cleaned_lines: list[str] = []
    previous_blank = False
    for raw_line in normalized.split("\n"):
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            if not previous_blank:
                cleaned_lines.append("")
            previous_blank = True
            continue
        cleaned_lines.append(line)
        previous_blank = False

    cleaned = "\n".join(cleaned_lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned
