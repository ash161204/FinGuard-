from pathlib import Path

import pytest

from app.schemas.common import ExtractionResult


def build_form16_result() -> ExtractionResult:
    return ExtractionResult(
        type="form16",
        status="partial",
        critical_ready=True,
        raw_text_available=True,
        data={
            "level_1": {
                "salary": 1800000,
                "hra_received": 240000,
                "rent_paid": 300000,
                "tax_deducted": 210000,
                "deductions": {
                    "80C": 150000,
                    "80D": 25000,
                    "80CCD1B": 50000,
                },
            },
            "level_2": {
                "lta": None,
                "bonus": None,
                "other_allowances": None,
                "professional_tax": None,
            },
            "level_3": {
                "previous_employer_income": None,
                "other_income": None,
                "losses": None,
            },
        },
        missing_fields=["level_2.lta"],
        warnings=["Gemini API key is not configured."],
        regex_candidates={"salary": 1800000},
    )


def test_upload_form16_creates_completed_job_and_persists_result(
    client,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    async def fake_extract_document(**_: object) -> ExtractionResult:
        return build_form16_result()

    monkeypatch.setattr("app.services.extraction_pipeline.extract_document", fake_extract_document)

    response = client.post(
        "/api/v1/upload/form16",
        files={"file": ("form16.pdf", b"%PDF-1.4 fake pdf", "application/pdf")},
    )

    assert response.status_code == 202
    payload = response.json()
    assert payload["type"] == "form16_upload"
    job_response = client.get(f"/api/v1/job/{payload['job_id']}")
    assert job_response.status_code == 200
    job_data = job_response.json()
    assert job_data["status"] == "completed"
    assert job_data["result"]["type"] == "form16"


def test_upload_rejects_non_pdf(client) -> None:
    response = client.post(
        "/api/v1/upload/form16",
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 400
