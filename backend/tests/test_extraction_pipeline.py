from pathlib import Path

import pytest

from app.schemas.common import ExtractionResult
from app.services.extraction_pipeline import extract_document
from app.services.gemini_client import GeminiConfigurationError, GeminiExtractionError


class MissingGeminiClient:
    async def structure_document(self, **_: object) -> dict:
        raise GeminiConfigurationError("Gemini API key is not configured.")


class RetryFailureGeminiClient:
    def __init__(self) -> None:
        self.calls = 0

    async def structure_document(self, **_: object) -> dict:
        self.calls += 1
        raise GeminiExtractionError("temporary upstream failure")


class FullGeminiClient:
    async def structure_document(self, **_: object) -> dict:
        return {
            "salary": 1800000,
            "hra_received": 240000,
            "rent_paid": 300000,
            "tax_deducted": 210000,
            "deductions": {
                "80C": 150000,
                "80D": 25000,
                "80CCD1B": 50000,
            },
            "lta": 50000,
            "bonus": 100000,
            "other_allowances": 80000,
            "professional_tax": 2500,
            "previous_employer_income": 0,
            "other_income": 0,
            "losses": 0,
        }


@pytest.mark.anyio
async def test_extract_document_returns_partial_with_regex_fallback(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sample_pdf = tmp_path / "form16.pdf"
    sample_pdf.write_bytes(b"%PDF-1.4 fake")
    monkeypatch.setattr(
        "app.services.extraction_pipeline.extract_pdf_text",
        lambda _: "\n".join(
            [
                "Gross Salary 1800000",
                "HRA Received 240000",
                "Rent Paid 300000",
                "Tax Deducted 210000",
                "Section 80C 150000",
                "Section 80D 25000",
                "80CCD1B 50000",
            ]
        ),
    )

    result = await extract_document(
        document_type="form16",
        file_path=sample_pdf,
        gemini_client=MissingGeminiClient(),
    )

    assert isinstance(result, ExtractionResult)
    assert result.status == "partial"
    assert result.critical_ready is True
    assert "Gemini API key is not configured." in result.warnings


@pytest.mark.anyio
async def test_extract_document_uses_ocr_fallback_when_pdf_text_is_empty(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sample_pdf = tmp_path / "scan.pdf"
    sample_pdf.write_bytes(b"%PDF-1.4 fake")
    monkeypatch.setattr("app.services.extraction_pipeline.extract_pdf_text", lambda _: "")
    monkeypatch.setattr(
        "app.services.extraction_pipeline.extract_text_with_ocr",
        lambda *_args, **_kwargs: "\n".join(
            [
                "Gross Salary 1800000",
                "HRA Received 240000",
                "Rent Paid 300000",
                "Tax Deducted 210000",
                "Section 80C 150000",
                "Section 80D 25000",
                "80CCD1B 50000",
            ]
        ),
    )

    result = await extract_document(
        document_type="form16",
        file_path=sample_pdf,
        gemini_client=MissingGeminiClient(),
    )

    assert result.raw_text_available is True
    assert any("Used OCR fallback" in warning for warning in result.warnings)


@pytest.mark.anyio
async def test_extract_document_retries_gemini_then_falls_back(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sample_pdf = tmp_path / "form16.pdf"
    sample_pdf.write_bytes(b"%PDF-1.4 fake")
    monkeypatch.setattr(
        "app.services.extraction_pipeline.extract_pdf_text",
        lambda _: "\n".join(
            [
                "Gross Salary 1800000",
                "HRA Received 240000",
                "Rent Paid 300000",
                "Tax Deducted 210000",
                "Section 80C 150000",
                "Section 80D 25000",
                "80CCD1B 50000",
            ]
        ),
    )
    client = RetryFailureGeminiClient()

    result = await extract_document(
        document_type="form16",
        file_path=sample_pdf,
        gemini_client=client,
    )

    assert client.calls == 2
    assert any("attempt 1 failed" in warning for warning in result.warnings)
    assert any("Falling back to regex-only extraction." in warning for warning in result.warnings)


@pytest.mark.anyio
async def test_extract_document_returns_complete_when_gemini_supplies_full_payload(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sample_pdf = tmp_path / "form16.pdf"
    sample_pdf.write_bytes(b"%PDF-1.4 fake")
    monkeypatch.setattr(
        "app.services.extraction_pipeline.extract_pdf_text",
        lambda _: "salary values present",
    )

    result = await extract_document(
        document_type="form16",
        file_path=sample_pdf,
        gemini_client=FullGeminiClient(),
    )

    assert result.status == "complete"
    assert result.critical_ready is True
    assert result.data["level_2"]["lta"] == 50000
