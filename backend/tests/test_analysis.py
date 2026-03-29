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
        warnings=[],
        regex_candidates={},
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
                    "category": "Flexi Cap",
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


def _upload_form16(client, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_extract_document(**_: object) -> ExtractionResult:
        return build_form16_result()

    monkeypatch.setattr("app.services.extraction_pipeline.extract_document", fake_extract_document)
    response = client.post(
        "/api/v1/upload/form16",
        files={"file": ("form16.pdf", b"%PDF-1.4 fake pdf", "application/pdf")},
    )
    assert response.status_code == 202


def _review_form16(client) -> None:
    response = client.put(
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
    assert response.status_code == 200


def _upload_cams(client, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_extract_document(**_: object) -> ExtractionResult:
        return build_cams_result()

    monkeypatch.setattr("app.services.extraction_pipeline.extract_document", fake_extract_document)
    response = client.post(
        "/api/v1/upload/cams",
        files={"file": ("cams.pdf", b"%PDF-1.4 fake pdf", "application/pdf")},
    )
    assert response.status_code == 202


def _review_cams(client) -> None:
    response = client.put(
        "/api/v1/extractions/cams/review",
        json={
            "review_status": "completed",
            "reviewed_data": {
                "holdings": [
                    {
                        "fund_name": "Axis Flexi Cap Fund",
                        "category": "Flexi Cap",
                        "invested": 125000,
                        "current": 150500,
                        "purchase_date": "31/01/2024",
                        "plan": "direct",
                    }
                ]
            },
        },
    )
    assert response.status_code == 200


def test_tax_analysis_persists_report_and_creates_actions(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_form16(client, monkeypatch)
    _review_form16(client)

    async def fake_run_engine(self, mode: str, payload: dict) -> dict:
        assert mode == "tax"
        assert payload["documentResults"][0]["epf"] == 150000
        return {
            "available": True,
            "bestRegime": "Old",
            "taxPayable": 120000,
            "refundOrPayable": 90000,
            "missedDeductions": [
                {
                    "name": "80C Gap",
                    "section": "80C",
                    "saving": 30000,
                    "description": "You have unused 80C capacity.",
                    "priority": "warn",
                }
            ],
            "investments": [
                {
                    "name": "ELSS Mutual Fund",
                    "section": "80C",
                    "gap": 50000,
                    "saving": 15000,
                    "priority": "P1",
                    "risk": "High",
                    "liquidity": "3-year lock",
                }
            ],
        }

    monkeypatch.setattr("app.services.analysis.EngineClient.run_engine", fake_run_engine)

    response = client.post("/api/v1/analyze/tax")

    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["recommended_regime"] == "Old"
    assert payload["summary"]["tax_payable"] == 120000
    assert len(payload["top_insights"]) >= 1

    actions_response = client.get("/api/v1/actions")
    assert actions_response.status_code == 200
    actions = actions_response.json()
    assert any(action["details"]["source"] == "tax" for action in actions)


def test_mf_analysis_persists_report_and_creates_actions(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_cams(client, monkeypatch)
    _review_cams(client)

    async def fake_run_engine(self, mode: str, payload: dict) -> dict:
        assert mode == "mf"
        assert payload["documentResults"][0]["holdings"][0]["plan"] == "Direct"
        return {
            "available": True,
            "riskProfile": "moderate",
            "totalCurrent": 150500,
            "avgXIRR": 0.124,
            "alerts": [
                {
                    "type": "warn",
                    "title": "Regular Plans Detected",
                    "message": "Switch to direct plans to reduce TER drag.",
                }
            ],
            "actions": [
                {
                    "title": "Reduce Equity for Medium-Term Goal",
                    "description": "Move excess equity into debt funds.",
                    "urgency": "month",
                    "impact": 45000,
                }
            ],
            "allocationPct": {"equity": 80, "debt": 20, "gold": 0},
        }

    monkeypatch.setattr("app.services.analysis.EngineClient.run_engine", fake_run_engine)

    response = client.post(
        "/api/v1/analyze/mf",
        json={"goal_horizon": "medium", "risk_vibe": "moderate"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["portfolio_value"] == 150500
    assert payload["summary"]["portfolio_xirr"] == 12.4
    assert payload["summary"]["risk_profile"] == "moderate"

    actions_response = client.get("/api/v1/actions")
    assert actions_response.status_code == 200
    actions = actions_response.json()
    assert any(action["details"]["source"] == "mf" for action in actions)


def test_score_uses_derived_reports_and_generates_changes(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _upload_form16(client, monkeypatch)
    _review_form16(client)
    _upload_cams(client, monkeypatch)
    _review_cams(client)

    async def fake_analysis_engine(self, mode: str, payload: dict) -> dict:
        if mode == "tax":
            return {
                "available": True,
                "bestRegime": "Old",
                "taxPayable": 120000,
                "refundOrPayable": 90000,
                "missedDeductions": [],
                "investments": [],
            }
        if mode == "mf":
            return {
                "available": True,
                "riskProfile": "moderate",
                "totalCurrent": 150500,
                "avgXIRR": 0.124,
                "alerts": [],
                "actions": [],
                "allocationPct": {"equity": 60, "debt": 30, "gold": 10},
            }
        raise AssertionError(f"unexpected mode: {mode}")

    monkeypatch.setattr("app.services.analysis.EngineClient.run_engine", fake_analysis_engine)
    assert client.post("/api/v1/analyze/tax").status_code == 200
    assert client.post("/api/v1/analyze/mf").status_code == 200

    calls = {"count": 0}

    async def fake_score_engine(self, mode: str, payload: dict) -> dict:
        assert mode == "score"
        assert payload["taxReport"]["bestRegime"] == "Old"
        assert payload["mfReport"]["riskProfile"] == "moderate"
        calls["count"] += 1
        base_score = 70 if calls["count"] == 1 else 82
        return {
            "overallScore": base_score,
            "overallGrade": "B" if base_score < 80 else "A",
            "dimensions": [
                {
                    "id": "H1",
                    "name": "Emergency Preparedness",
                    "score": 60 if calls["count"] == 1 else 80,
                    "grade": "B" if calls["count"] == 1 else "A",
                    "detail": "4 months covered",
                    "tip": "Increase emergency corpus.",
                }
            ],
        }

    monkeypatch.setattr("app.services.analysis.EngineClient.run_engine", fake_score_engine)

    first = client.post(
        "/api/v1/score",
        json={
            "monthly_income": 150000,
            "monthly_expenses": 70000,
            "health_inputs": {"emergencyFund": 280000},
        },
    )
    assert first.status_code == 200
    assert first.json()["changes"] == []

    second = client.post(
        "/api/v1/score",
        json={
            "monthly_income": 150000,
            "monthly_expenses": 70000,
            "health_inputs": {"emergencyFund": 500000},
        },
    )

    assert second.status_code == 200
    payload = second.json()
    assert payload["score"] == 82
    assert any(change["metric"] == "overall" for change in payload["changes"])
    assert any(change["metric"] == "H1" for change in payload["changes"])


def test_fire_returns_plan_and_manual_actions_support_updates(client) -> None:
    response = client.post(
        "/api/v1/fire",
        json={
            "current_age": 30,
            "target_retirement_age": 45,
            "monthly_income": 150000,
            "monthly_expenses": 70000,
            "current_corpus": 1200000,
            "monthly_sip": 50000,
            "expected_annual_expense_at_retirement": 1800000,
            "return_rate": 0.12,
            "inflation": 0.06,
            "salary_growth": 0.08,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["retirement_age"] >= 30
    assert len(payload["yearly_plan"]) == 15
    assert payload["corpus"]["required"] > 0

    create_action = client.post(
        "/api/v1/actions",
        json={
            "title": "Review FIRE assumptions",
            "subtitle": "Validate monthly expenses and retirement corpus target.",
            "impact": 0,
            "priority": "medium",
            "action": "Revisit FIRE inputs after checking annual budgets.",
            "progress": 10,
        },
    )
    assert create_action.status_code == 201
    action_id = create_action.json()["id"]

    update_action = client.patch(
        f"/api/v1/actions/{action_id}",
        json={"status": "in_progress", "progress": 40},
    )
    assert update_action.status_code == 200
    updated = update_action.json()
    assert updated["status"] == "in_progress"
    assert updated["progress"] == 40
