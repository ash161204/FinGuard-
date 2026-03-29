from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class InsightCard(BaseModel):
    title: str
    subtitle: str
    impact: float
    priority: Literal["high", "medium", "low"]
    action: str


class TaxAnalysisSummary(BaseModel):
    recommended_regime: str
    tax_payable: float
    refund_or_payable: float


class TaxAnalysisResponse(BaseModel):
    summary: TaxAnalysisSummary
    top_insights: list[InsightCard]
    full_report: dict[str, Any]


class MfAnalysisRequest(BaseModel):
    risk_vibe: str | None = None
    tax_slab: float | None = None
    expected_return: float | None = None
    goal_horizon: Literal["short", "medium", "long"] | None = None
    emergency_fund_state: Literal["none", "partial", "adequate", "unknown"] | None = None


class MfAnalysisSummary(BaseModel):
    portfolio_value: float
    portfolio_xirr: float
    risk_profile: str


class MfAnalysisResponse(BaseModel):
    summary: MfAnalysisSummary
    top_insights: list[InsightCard]
    full_report: dict[str, Any]


class ScoreRequest(BaseModel):
    monthly_income: float | None = None
    monthly_expenses: float | None = None
    health_inputs: dict[str, Any] = Field(default_factory=dict)


class ScoreDimension(BaseModel):
    id: str
    name: str
    score: float
    grade: str
    detail: str
    tip: str


class ScoreChange(BaseModel):
    metric: str
    previous: float
    current: float
    delta: float


class ScoreResponse(BaseModel):
    score: float
    grade: str
    dimensions: list[ScoreDimension]
    changes: list[ScoreChange]


class FireRequest(BaseModel):
    current_age: int
    target_retirement_age: int
    monthly_income: float
    monthly_expenses: float
    current_corpus: float
    monthly_sip: float
    expected_annual_expense_at_retirement: float
    return_rate: float = 0.12
    inflation: float = 0.06
    salary_growth: float = 0.08


class FireYearPlan(BaseModel):
    age: int
    annual_income: float
    annual_expenses: float
    annual_sip: float
    projected_corpus: float
    required_corpus: float
    gap: float


class FireCorpusSummary(BaseModel):
    required: float
    projected: float
    gap: float


class FireResponse(BaseModel):
    retirement_age: int
    yearly_plan: list[FireYearPlan]
    corpus: FireCorpusSummary


class ActionResponse(BaseModel):
    id: UUID
    action_type: str
    status: str
    progress: int
    details: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class ActionUpdateRequest(BaseModel):
    status: Literal["pending", "in_progress", "completed", "dismissed", "archived"] | None = None
    progress: int | None = None


class ManualActionCreateRequest(BaseModel):
    title: str
    subtitle: str
    impact: float = 0
    priority: Literal["high", "medium", "low"] = "medium"
    action: str
    status: Literal["pending", "in_progress", "completed", "dismissed", "archived"] = "pending"
    progress: int = 0
