from pathlib import Path


class PdfTextExtractionError(RuntimeError):
    """Raised when PDF text extraction cannot be completed."""


def extract_pdf_text(file_path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover - depends on optional dependency
        raise PdfTextExtractionError("pypdf is not installed.") from exc

    try:
        reader = PdfReader(str(file_path))
    except Exception as exc:  # pragma: no cover - parser-specific failure
        raise PdfTextExtractionError(f"Could not open PDF: {exc}") from exc

    page_text = []
    for page in reader.pages:
        extracted = page.extract_text() or ""
        if extracted.strip():
            page_text.append(extracted)

    return "\n\n".join(page_text).strip()
