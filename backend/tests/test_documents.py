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
        missing_fields=[
            "level_2.lta",
            "level_2.bonus",
            "level_2.other_allowances",
            "level_2.professional_tax",
        ],
        warnings=[],
        regex_candidates={"salary": 1800000},
    )


def build_cams_result() -> ExtractionResult:
    return ExtractionResult(
        type="cams",
        status="partial",
        critical_ready=True,
        raw_text_available=True,
        data={
            "holdings": [
                {
                    "fund_name": "Axis Flexi Cap Fund",
                    "category": "Equity",
                    "invested": 125000,
                    "current": 150500,
                    "purchase_date": "31/01/2024",
                    "plan": None,
                }
            ]
        },
        missing_fields=["holdings[0].plan"],
        warnings=[],
        regex_candidates={},
    )


def _upload_form16(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_extract_document(**_: object) -> ExtractionResult:
        return build_form16_result()

    monkeypatch.setattr("app.services.extraction_pipeline.extract_document", fake_extract_document)
    response = client.post(
        "/api/v1/upload/form16",
        files={"file": ("form16.pdf", b"%PDF-1.4 fake pdf", "application/pdf")},
    )
    assert response.status_code == 202


def _upload_cams(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_extract_document(**_: object) -> ExtractionResult:
        return build_cams_result()

    monkeypatch.setattr("app.services.extraction_pipeline.extract_document", fake_extract_document)
    response = client.post(
        "/api/v1/upload/cams",
        files={"file": ("cams.pdf", b"%PDF-1.4 fake pdf", "application/pdf")},
    )
    assert response.status_code == 202


def test_get_latest_extraction_returns_raw_and_review_defaults(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_form16(client, monkeypatch)

    response = client.get("/api/v1/extractions/form16/latest")

    assert response.status_code == 200
    payload = response.json()
    assert payload["review_status"] == "pending"
    assert payload["raw_extracted_data"]["level_1"]["salary"] == 1800000
    assert payload["reviewed_data"]["level_1"]["salary"] == 1800000
    assert payload["validation"]["critical_ready"] is True
    assert payload["validation"]["status"] == "partial"
    assert payload["normalized_data"] is None


def test_review_endpoint_rejects_hallucinated_fields(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_form16(client, monkeypatch)

    response = client.put(
        "/api/v1/extractions/form16/review",
        json={
            "review_status": "pending",
            "reviewed_data": {
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
                    "unexpected_bonus_bucket": 1,
                },
                "level_2": {},
                "level_3": {},
            },
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_review_payload"


def test_review_endpoint_blocks_completed_status_when_core_fields_missing(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_form16(client, monkeypatch)

    response = client.put(
        "/api/v1/extractions/form16/review",
        json={
            "review_status": "completed",
            "reviewed_data": {
                "level_1": {
                    "salary": None,
                    "hra_received": 240000,
                    "rent_paid": 300000,
                    "tax_deducted": 210000,
                    "deductions": {
                        "80C": 150000,
                        "80D": 25000,
                        "80CCD1B": 50000,
                    },
                },
                "level_2": {},
                "level_3": {},
            },
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["detail"]["code"] == "review_incomplete"
    assert "level_1.salary" in payload["detail"]["details"]["blocking_fields"]


def test_review_and_normalize_form16_persists_reviewed_and_normalized_data(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_form16(client, monkeypatch)

    review_response = client.put(
        "/api/v1/extractions/form16/review",
        json={
            "review_status": "completed",
            "reviewed_data": {
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
                    "lta": 50000,
                    "bonus": 100000,
                    "other_allowances": 80000,
                    "professional_tax": 2500,
                },
                "level_3": {
                    "previous_employer_income": 0,
                    "other_income": 15000,
                    "losses": 0,
                },
            },
        },
    )

    assert review_response.status_code == 200
    normalize_response = client.post("/api/v1/extractions/form16/normalize")
    assert normalize_response.status_code == 200
    normalized = normalize_response.json()
    assert normalized["type"] == "form16"
    assert normalized["data"]["salary"] == 1800000.0
    assert normalized["data"]["deductions"]["80C"] == 150000.0
    assert normalized["data"]["basic"] is None
    assert normalized["audit"]["validation"]["status"] == "complete"

    latest_response = client.get("/api/v1/extractions/form16/latest")
    assert latest_response.status_code == 200
    latest = latest_response.json()
    assert latest["review_status"] == "completed"
    assert latest["normalized_data"]["bonus"] == 100000.0


def test_normalize_cams_converts_dates_and_plan(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_cams(client, monkeypatch)

    review_response = client.put(
        "/api/v1/extractions/cams/review",
        json={
            "review_status": "completed",
            "reviewed_data": {
                "holdings": [
                    {
                        "fund_name": "Axis Flexi Cap Fund",
                        "category": "Equity",
                        "invested": 125000,
                        "current": 150500,
                        "purchase_date": "31/01/2024",
                        "plan": "direct",
                    }
                ]
            },
        },
    )

    assert review_response.status_code == 200
    normalize_response = client.post("/api/v1/extractions/cams/normalize")

    assert normalize_response.status_code == 200
    normalized = normalize_response.json()
    holding = normalized["data"]["holdings"][0]
    assert holding["purchase_date"] == "2024-01-31"
    assert holding["plan"] == "Direct"
    assert "holdings[0].purchase_date" in normalized["audit"]["date_fields_normalized"]
