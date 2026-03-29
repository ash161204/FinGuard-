import pytest
from uuid import uuid4
from unittest.mock import MagicMock

from app.services.analysis import (
    RankedInsightCandidate,
    _top_insights,
    _future_value_lumpsum,
    _future_value_sip,
    _required_annual_expense_at_age,
    _priority_to_numeric,
    _urgency_to_numeric,
    _normalize_money_score,
    sync_inferred_actions
)
from app.services.normalization import (
    _to_float,
    _normalize_date,
    _canonical_plan
)
from app.schemas.analysis import InsightCard

def test_ranking_logic():
    # Test RankedInsightCandidate rank_score calculation
    # rank_score = (money * 0.5) + (risk * 0.3) + (urgency * 0.2)
    candidate = RankedInsightCandidate(
        title="Test",
        subtitle="Sub",
        impact=1000,
        action="Do it",
        money_score=100,
        risk_score=50,
        urgency_score=20
    )
    # (100 * 0.5) + (50 * 0.3) + (20 * 0.2) = 50 + 15 + 4 = 69
    assert candidate.rank_score == 69.0
    assert candidate.priority == "medium"

    # Test top insights sorting
    c1 = RankedInsightCandidate("Low", "S", 10, "A", 10, 10, 10) # score 10
    c2 = RankedInsightCandidate("High", "S", 100, "A", 90, 90, 90) # score 90
    c3 = RankedInsightCandidate("Mid", "S", 50, "A", 50, 50, 50) # score 50
    
    top = _top_insights([c1, c2, c3], limit=2)
    assert len(top) == 2
    assert top[0].title == "High"
    assert top[1].title == "Mid"

def test_normalization_helpers():
    # _to_float
    assert _to_float("1,234.56") == 1234.56
    assert _to_float("₹ 5,000") == 5000.0
    assert _to_float(None) is None
    assert _to_float("") is None
    
    # _normalize_date
    date_str, success = _normalize_date("31/03/2024")
    assert success is True
    assert date_str == "2024-03-31"
    
    date_str, success = _normalize_date("2024-03-31")
    assert success is True
    assert date_str == "2024-03-31"

    date_str, success = _normalize_date("invalid")
    assert success is False
    
    # _canonical_plan
    assert _canonical_plan("direct") == "Direct"
    assert _canonical_plan("REGULAR") == "Regular"
    assert _canonical_plan(None) is None

def test_fire_formulas():
    # _future_value_lumpsum: corpus * ((1 + annual_return) ** years)
    assert _future_value_lumpsum(100, 0.1, 1) == pytest.approx(110.0)
    assert _future_value_lumpsum(100, 0.1, 2) == pytest.approx(121.0)
    
    # _future_value_sip
    # SIP 1000, 12% return, 1 year
    fv_sip = _future_value_sip(1000, 0.12, 1)
    assert fv_sip == pytest.approx(12682.5, rel=1e-2)
    
    # _required_annual_expense_at_age
    # Expense 100, 6% inflation, 1 year after retirement
    req = _required_annual_expense_at_age(
        expected_annual_expense_at_retirement=100,
        inflation=0.06,
        target_retirement_age=40,
        age=41
    )
    assert req == 106.0

def test_helper_utilities():
    assert _priority_to_numeric("high") == 85
    assert _priority_to_numeric("warn") == 65
    assert _urgency_to_numeric("now") == 95
    assert _normalize_money_score(50, 100) == 50.0
    assert _normalize_money_score(200, 100) == 100.0

def test_sync_inferred_actions_logic():
    session = MagicMock()
    user_id = uuid4()
    insights = [
        InsightCard(title="Save Tax", subtitle="Sub", impact=1000, priority="high", action="Do it")
    ]
    
    # Mock repository
    repo_mock = MagicMock()
    # No existing actions
    repo_mock.list_for_source.return_value = []
    
    with pytest.MonkeyPatch().context() as mp:
        mp.setattr("app.services.analysis.ActionRepository", lambda s: repo_mock)
        sync_inferred_actions(session, user_id=user_id, source="test", insights=insights)
    
    # Should call create once
    assert repo_mock.create.called