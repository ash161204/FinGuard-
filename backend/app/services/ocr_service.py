import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory


class OcrUnavailableError(RuntimeError):
    """Raised when OCR tooling is unavailable or fails."""


@dataclass(frozen=True)
class OcrCapability:
    available: bool
    tesseract_path: str | None
    pdftoppm_path: str | None
    missing_tools: list[str]


def detect_ocr_capability() -> OcrCapability:
    tesseract_path = shutil.which("tesseract")
    pdftoppm_path = shutil.which("pdftoppm")
    missing_tools = []
    if tesseract_path is None:
        missing_tools.append("tesseract")
    if pdftoppm_path is None:
        missing_tools.append("pdftoppm")

    return OcrCapability(
        available=not missing_tools,
        tesseract_path=tesseract_path,
        pdftoppm_path=pdftoppm_path,
        missing_tools=missing_tools,
    )


def extract_text_with_ocr(file_path: Path, *, lang: str) -> str:
    capability = detect_ocr_capability()
    if not capability.available:
        raise OcrUnavailableError(
            f"OCR unavailable. Missing tools: {', '.join(capability.missing_tools)}"
        )

    with TemporaryDirectory() as temp_dir:
        prefix = Path(temp_dir) / "page"
        subprocess.run(
            [capability.pdftoppm_path, "-png", str(file_path), str(prefix)],
            check=True,
            capture_output=True,
            text=True,
        )
        images = sorted(Path(temp_dir).glob("page-*.png"))
        if not images:
            raise OcrUnavailableError("OCR fallback could not render PDF pages.")

        page_text = []
        for image_path in images:
            result = subprocess.run(
                [capability.tesseract_path, str(image_path), "stdout", "-l", lang],
                check=True,
                capture_output=True,
                text=True,
            )
            if result.stdout.strip():
                page_text.append(result.stdout)

        return "\n\n".join(page_text).strip()
