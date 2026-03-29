from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.action_repository import ActionRepository
from app.repositories.derived_data_repository import DerivedDataRepository
from app.repositories.extracted_data_repository import ExtractedDataRepository
from app.repositories.normalized_profile_repository import NormalizedProfileRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.score_history_repository import ScoreHistoryRepository
from app.schemas.analysis import (
    FireCorpusSummary,
    FireRequest,
    FireResponse,
    FireYearPlan,
    InsightCard,
    MfAnalysisRequest,
    MfAnalysisResponse,
    MfAnalysisSummary,
    ScoreChange,
    ScoreDimension,
    ScoreRequest,
    ScoreResponse,
    TaxAnalysisResponse,
    TaxAnalysisSummary,
)
from app.services.document_validation import DocumentValidationError
from app.services.engine_client import EngineClient
from app.services.normalization import normalize_document

DocumentType = Literal["form16", "cams"]


class AnalysisInputError(RuntimeError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


@dataclass(frozen=True)
class RankedInsightCandidate:
    title: str
    subtitle: str
    impact: float
    action: str
    money_score: float
    risk_score: float
    urgency_score: float

    @property
    def rank_score(self) -> float:
        return (self.money_score * 0.5) + (self.risk_score * 0.3) + (self.urgency_score * 0.2)

    @property
    def priority(self) -> str:
        if self.rank_score >= 75:
            return "high"
        if self.rank_score >= 50:
            return "medium"
        return "low"

    def to_card(self) -> InsightCard:
        return InsightCard(
            title=self.title,
            subtitle=self.subtitle,
            impact=round(float(self.impact), 2),
            priority=self.priority,
            action=self.action,
        )


def _slugify(value: str) -> str:
    return "-".join("".join(char.lower() if char.isalnum() else " " for char in value).split())


def _priority_to_numeric(value: str) -> float:
    normalized = value.lower()
    if normalized in {"p1", "danger", "high"}:
        return 85
    if normalized in {"p2", "warn", "medium"}:
        return 65
    if normalized in {"p3", "info", "low"}:
        return 40
    return 50


def _urgency_to_numeric(value: str) -> float:
    normalized = value.lower()
    if normalized in {"now", "immediate"}:
        return 95
    if normalized in {"month", "monthly"}:
        return 75
    if normalized in {"quarter", "quarterly"}:
        return 55
    if normalized in {"annual", "yearly"}:
        return 40
    return 60


def _normalize_money_score(impact: float, max_impact: float) -> float:
    if max_impact <= 0:
        return 0
    return min((impact / max_impact) * 100, 100)


def _get_normalized_document(
    session: Session,
    *,
    user_id: UUID,
    document_type: DocumentType,
) -> dict[str, Any]:
    normalized_repo = NormalizedProfileRepository(session)
    normalized_profile = normalized_repo.get(user_id)
    if normalized_profile is not None:
        existing = (normalized_profile.data_json or {}).get(document_type)
        if existing:
            return dict(existing)

    extracted_repo = ExtractedDataRepository(session)
    document = extracted_repo.get_latest(user_id=user_id, document_type=document_type)
    if document is None:
        raise AnalysisInputError(
            f"No {document_type} extraction is available.",
            details={"document_type": document_type},
        )

    source_data = dict(document.reviewed_data_json or (document.data_json or {}).get("data") or {})
    try:
        normalized = normalize_document(document_type=document_type, data=source_data)
    except DocumentValidationError as exc:
        raise AnalysisInputError(
            "Document cannot be normalized until required fields are available.",
            details=exc.details,
        ) from exc

    validation = normalized.audit["validation"]
    if not validation["critical_ready"]:
        raise AnalysisInputError(
            "Document cannot be analyzed until required fields are available.",
            details=validation,
        )

    normalized_repo.upsert_document(
        user_id=user_id,
        document_type=document_type,
        data_json=normalized.data,
        audit_json={
            **normalized.audit,
            "source_document_id": str(document.id),
            "review_status": document.review_status,
        },
    )
    return normalized.data


def _prepare_tax_engine_document(normalized: dict[str, Any]) -> dict[str, Any]:
    deductions = normalized.get("deductions") or {}
    salary = float(normalized.get("salary") or 0)
    other_income = float(normalized.get("other_income") or 0)
    return {
        "salary": salary,
        "gross_salary": salary,
        "total_income": salary + other_income,
        "basic": normalized.get("basic"),
        "hra_received": normalized.get("hra_received"),
        "rent_paid": normalized.get("rent_paid"),
        "tax_deducted": normalized.get("tax_deducted"),
        "professional_tax": normalized.get("professional_tax"),
        "lta": normalized.get("lta"),
        "other_allowances": normalized.get("other_allowances"),
        "bonus": normalized.get("bonus"),
        "other_income": normalized.get("other_income"),
        "previous_employer_income": normalized.get("previous_employer_income"),
        "losses": normalized.get("losses"),
        "epf": deductions.get("80C"),
        "health_insurance": deductions.get("80D"),
        "nps_80ccd1b": deductions.get("80CCD1B"),
        "deductions": deductions,
    }


def _build_tax_candidates(report: dict[str, Any]) -> list[RankedInsightCandidate]:
    raw_candidates: list[dict[str, Any]] = []
    for item in report.get("missedDeductions") or report.get("missedItems") or []:
        saving = float(item.get("saving") or 0)
        raw_candidates.append(
            {
                "title": item.get("name") or "Tax optimization opportunity",
                "subtitle": item.get("description") or "A missed deduction was detected.",
                "impact": saving,
                "action": (
                    f"Review {item.get('section') or 'the deduction'} "
                    "and claim the eligible amount."
                ),
                "risk_score": _priority_to_numeric(item.get("priority") or "warn"),
                "urgency_score": 85,
            }
        )

    for item in report.get("investments") or []:
        saving = float(item.get("saving") or 0)
        gap = float(item.get("gap") or 0)
        raw_candidates.append(
            {
                "title": item.get("name") or "Tax-saving investment",
                "subtitle": (
                    f"Section {item.get('section') or 'tax'} • "
                    f"Risk {item.get('risk') or 'Unknown'} • "
                    f"Liquidity {item.get('liquidity') or 'Unknown'}"
                ),
                "impact": saving,
                "action": (
                    f"Allocate Rs. {round(gap):,} "
                    f"to {item.get('name') or 'this instrument'}."
                ),
                "risk_score": _priority_to_numeric(item.get("priority") or "p2"),
                "urgency_score": _priority_to_numeric(item.get("priority") or "p2"),
            }
        )

    max_impact = max((candidate["impact"] for candidate in raw_candidates), default=0)
    return [
        RankedInsightCandidate(
            title=candidate["title"],
            subtitle=candidate["subtitle"],
            impact=candidate["impact"],
            action=candidate["action"],
            money_score=_normalize_money_score(candidate["impact"], max_impact),
            risk_score=candidate["risk_score"],
            urgency_score=candidate["urgency_score"],
        )
        for candidate in raw_candidates
        if candidate["impact"] > 0
    ]


def _build_mf_candidates(report: dict[str, Any]) -> list[RankedInsightCandidate]:
    total_current = float(report.get("totalCurrent") or 0)
    raw_candidates: list[dict[str, Any]] = []

    for item in report.get("actions") or []:
        impact = float(item.get("impact") or 0)
        urgency = item.get("urgency") or "month"
        raw_candidates.append(
            {
                "title": item.get("title") or "Portfolio action",
                "subtitle": item.get("description") or "Portfolio action identified.",
                "impact": impact,
                "action": (
                    item.get("description")
                    or item.get("title")
                    or "Review the portfolio action."
                ),
                "risk_score": _urgency_to_numeric(urgency),
                "urgency_score": _urgency_to_numeric(urgency),
            }
        )

    alert_impact_factor = {"danger": 0.08, "warn": 0.05, "info": 0.02}
    alert_risk = {"danger": 90, "warn": 70, "info": 45}
    alert_urgency = {"danger": 90, "warn": 70, "info": 40}
    for item in report.get("alerts") or []:
        level = str(item.get("type") or "warn").lower()
        raw_candidates.append(
            {
                "title": item.get("title") or "Portfolio alert",
                "subtitle": item.get("message") or "Portfolio alert generated.",
                "impact": total_current * alert_impact_factor.get(level, 0.03),
                "action": (
                    item.get("message")
                    or item.get("title")
                    or "Review this portfolio alert."
                ),
                "risk_score": alert_risk.get(level, 60),
                "urgency_score": alert_urgency.get(level, 60),
            }
        )

    max_impact = max((candidate["impact"] for candidate in raw_candidates), default=0)
    return [
        RankedInsightCandidate(
            title=candidate["title"],
            subtitle=candidate["subtitle"],
            impact=candidate["impact"],
            action=candidate["action"],
            money_score=_normalize_money_score(candidate["impact"], max_impact),
            risk_score=candidate["risk_score"],
            urgency_score=candidate["urgency_score"],
        )
        for candidate in raw_candidates
        if candidate["impact"] > 0
    ]


def _top_insights(candidates: list[RankedInsightCandidate], limit: int = 3) -> list[InsightCard]:
    ranked = sorted(candidates, key=lambda item: item.rank_score, reverse=True)
    return [candidate.to_card() for candidate in ranked[:limit]]


def _serialize_action(action) -> dict[str, Any]:
    return {
        "id": action.id,
        "action_type": action.action_type,
        "status": action.status,
        "progress": action.progress,
        "details": dict(action.details_json or {}),
        "created_at": action.created_at,
        "updated_at": action.updated_at,
    }


def sync_inferred_actions(
    session: Session,
    *,
    user_id: UUID,
    source: str,
    insights: list[InsightCard],
) -> list[dict[str, Any]]:
    repository = ActionRepository(session)
    existing = {
        (action.details_json or {}).get("source_key"): action
        for action in repository.list_for_source(user_id=user_id, source=source)
    }
    current_keys: set[str] = set()

    for index, insight in enumerate(insights, start=1):
        source_key = f"{source}:{_slugify(insight.title)}"
        current_keys.add(source_key)
        details = {
            "source": source,
            "source_key": source_key,
            "title": insight.title,
            "subtitle": insight.subtitle,
            "impact": insight.impact,
            "priority": insight.priority,
            "action": insight.action,
            "rank": index,
            "inferred": True,
        }
        existing_action = existing.get(source_key)
        if existing_action is None:
            repository.create(
                user_id=user_id,
                action_type=f"inferred_{source}",
                details_json=details,
            )
            continue

        preserved_status = existing_action.status
        if preserved_status == "archived":
            preserved_status = "pending"
        repository.update(
            existing_action,
            action_type=f"inferred_{source}",
            status=preserved_status,
            details_json=details,
        )

    for source_key, action in existing.items():
        if source_key not in current_keys:
            repository.update(action, status="archived")

    actions = repository.list_for_source(user_id=user_id, source=source)
    return [_serialize_action(action) for action in actions]


async def analyze_tax(
    session: Session,
    *,
    user_id: UUID,
) -> TaxAnalysisResponse:
    normalized = _get_normalized_document(session, user_id=user_id, document_type="form16")
    engine_payload = {"documentResults": [_prepare_tax_engine_document(normalized)]}
    report = await EngineClient().run_engine("tax", engine_payload)

    if not report.get("available"):
        raise AnalysisInputError(
            "Tax analysis could not be generated from the available data.",
            details={"report": report},
        )

    response = TaxAnalysisResponse(
        summary=TaxAnalysisSummary(
            recommended_regime=report.get("bestRegime") or report.get("recommendedRegime") or "",
            tax_payable=float(report.get("taxPayable") or report.get("bestTax") or 0),
            refund_or_payable=float(report.get("refundOrPayable") or 0),
        ),
        top_insights=_top_insights(_build_tax_candidates(report)),
        full_report=report,
    )

    derived_repo = DerivedDataRepository(session)
    derived_repo.update_tax_report(user_id=user_id, payload=response.model_dump())
    sync_inferred_actions(session, user_id=user_id, source="tax", insights=response.top_insights)
    return response


async def analyze_mf(
    session: Session,
    *,
    user_id: UUID,
    request: MfAnalysisRequest | None = None,
) -> MfAnalysisResponse:
    normalized = _get_normalized_document(session, user_id=user_id, document_type="cams")
    options = {}
    if request is not None:
        if request.risk_vibe is not None:
            options["riskVibe"] = request.risk_vibe
        if request.tax_slab is not None:
            options["taxSlab"] = request.tax_slab
        if request.expected_return is not None:
            options["expReturn"] = request.expected_return
        if request.goal_horizon is not None:
            options["goalHorizon"] = request.goal_horizon
        if request.emergency_fund_state is not None:
            options["emerFund"] = request.emergency_fund_state

    report = await EngineClient().run_engine(
        "mf",
        {
            "documentResults": [normalized],
            "options": options,
        },
    )

    if not report.get("available"):
        raise AnalysisInputError(
            "Mutual fund analysis could not be generated from the available data.",
            details={"report": report},
        )

    response = MfAnalysisResponse(
        summary=MfAnalysisSummary(
            portfolio_value=float(report.get("totalCurrent") or 0),
            portfolio_xirr=round(float(report.get("avgXIRR") or 0) * 100, 2),
            risk_profile=str(report.get("riskProfile") or "moderate"),
        ),
        top_insights=_top_insights(_build_mf_candidates(report)),
        full_report=report,
    )

    derived_repo = DerivedDataRepository(session)
    derived_repo.update_mf_report(user_id=user_id, payload=response.model_dump())
    sync_inferred_actions(session, user_id=user_id, source="mf", insights=response.top_insights)
    return response


def _score_changes(
    *,
    previous_score_json: dict[str, Any] | None,
    current_score: float,
    current_dimensions: list[ScoreDimension],
) -> list[ScoreChange]:
    if not previous_score_json:
        return []

    changes: list[ScoreChange] = []
    previous_score = float(previous_score_json.get("score") or 0)
    changes.append(
        ScoreChange(
            metric="overall",
            previous=previous_score,
            current=current_score,
            delta=round(current_score - previous_score, 2),
        )
    )

    previous_dimensions = {
        dimension.get("id"): dimension
        for dimension in previous_score_json.get("dimensions") or []
    }
    for dimension in current_dimensions:
        previous = previous_dimensions.get(dimension.id)
        if previous is None:
            continue
        previous_score_value = float(previous.get("score") or 0)
        changes.append(
            ScoreChange(
                metric=dimension.id,
                previous=previous_score_value,
                current=dimension.score,
                delta=round(dimension.score - previous_score_value, 2),
            )
        )
    return changes


async def score_user(
    session: Session,
    *,
    user_id: UUID,
    request: ScoreRequest,
) -> ScoreResponse:
    profile_repo = ProfileRepository(session)
    profile, _ = profile_repo.get_or_create(user_id)
    profile_income = (
        request.monthly_income if request.monthly_income is not None else profile.income
    )
    profile_expenses = (
        request.monthly_expenses if request.monthly_expenses is not None else profile.expenses
    )
    if request.monthly_income is not None or request.monthly_expenses is not None:
        profile_repo.update(
            profile,
            income=profile_income,
            expenses=profile_expenses,
        )

    monthly_income = profile_income
    monthly_expenses = profile_expenses

    derived_repo = DerivedDataRepository(session)
    derived = derived_repo.get(user_id)
    tax_report = (derived.tax_report_json or {}).get("full_report") if derived else None
    mf_report = (derived.mf_report_json or {}).get("full_report") if derived else None
    previous_score_json = dict(derived.score_json or {}) if derived and derived.score_json else None

    report = await EngineClient().run_engine(
        "score",
        {
            "healthInputs": request.health_inputs,
            "monthlyIncome": monthly_income,
            "monthlyExpenses": monthly_expenses,
            "taxReport": tax_report,
            "mfReport": mf_report,
        },
    )

    dimensions = [
        ScoreDimension(
            id=dimension["id"],
            name=dimension["name"],
            score=float(dimension["score"]),
            grade=dimension["grade"],
            detail=dimension["detail"],
            tip=dimension["tip"],
        )
        for dimension in report.get("dimensions") or []
    ]
    response = ScoreResponse(
        score=float(report.get("overallScore") or 0),
        grade=str(report.get("overallGrade") or "F"),
        dimensions=dimensions,
        changes=_score_changes(
            previous_score_json=previous_score_json,
            current_score=float(report.get("overallScore") or 0),
            current_dimensions=dimensions,
        ),
    )

    derived_repo.update_score(user_id=user_id, payload=response.model_dump())
    ScoreHistoryRepository(session).create(user_id=user_id, score=response.score)
    return response


def _future_value_lumpsum(current_corpus: float, annual_return: float, years: float) -> float:
    return current_corpus * ((1 + annual_return) ** years)


def _future_value_sip(monthly_sip: float, annual_return: float, years: float) -> float:
    months = max(int(round(years * 12)), 0)
    if months == 0:
        return 0
    monthly_rate = ((1 + annual_return) ** (1 / 12)) - 1
    if monthly_rate == 0:
        return monthly_sip * months
    return monthly_sip * ((((1 + monthly_rate) ** months) - 1) / monthly_rate)


def _required_annual_expense_at_age(
    *,
    expected_annual_expense_at_retirement: float,
    inflation: float,
    target_retirement_age: int,
    age: int,
) -> float:
    year_delta = age - target_retirement_age
    return expected_annual_expense_at_retirement * ((1 + inflation) ** year_delta)


def build_fire_plan(
    session: Session,
    *,
    user_id: UUID,
    request: FireRequest,
) -> FireResponse:
    if request.target_retirement_age <= request.current_age:
        raise AnalysisInputError("Target retirement age must be greater than current age.")

    profile_repo = ProfileRepository(session)
    profile, _ = profile_repo.get_or_create(user_id)
    profile_repo.update(profile, income=request.monthly_income, expenses=request.monthly_expenses)

    plan: list[FireYearPlan] = []
    target_age = request.target_retirement_age
    annual_income_start = request.monthly_income * 12
    annual_expenses_start = request.monthly_expenses * 12

    for age in range(request.current_age + 1, target_age + 1):
        years = age - request.current_age
        annual_income = annual_income_start * ((1 + request.salary_growth) ** years)
        annual_expenses = annual_expenses_start * ((1 + request.inflation) ** years)
        projected_corpus = _future_value_lumpsum(
            request.current_corpus,
            request.return_rate,
            years,
        ) + _future_value_sip(request.monthly_sip, request.return_rate, years)
        required_annual_expense = _required_annual_expense_at_age(
            expected_annual_expense_at_retirement=request.expected_annual_expense_at_retirement,
            inflation=request.inflation,
            target_retirement_age=target_age,
            age=age,
        )
        required_corpus = required_annual_expense * 25
        plan.append(
            FireYearPlan(
                age=age,
                annual_income=round(annual_income, 2),
                annual_expenses=round(annual_expenses, 2),
                annual_sip=round(request.monthly_sip * 12, 2),
                projected_corpus=round(projected_corpus, 2),
                required_corpus=round(required_corpus, 2),
                gap=round(required_corpus - projected_corpus, 2),
            )
        )

    search_upper_age = max(target_age + 25, request.current_age + 1)
    retirement_age = target_age
    for age in range(request.current_age, search_upper_age + 1):
        years = age - request.current_age
        projected_corpus = _future_value_lumpsum(
            request.current_corpus,
            request.return_rate,
            years,
        ) + _future_value_sip(request.monthly_sip, request.return_rate, years)
        required_annual_expense = _required_annual_expense_at_age(
            expected_annual_expense_at_retirement=request.expected_annual_expense_at_retirement,
            inflation=request.inflation,
            target_retirement_age=target_age,
            age=age,
        )
        required_corpus = required_annual_expense * 25
        if projected_corpus >= required_corpus:
            retirement_age = age
            break

    target_year = plan[-1]
    response = FireResponse(
        retirement_age=retirement_age,
        yearly_plan=plan,
        corpus=FireCorpusSummary(
            required=target_year.required_corpus,
            projected=target_year.projected_corpus,
            gap=target_year.gap,
        ),
    )

    DerivedDataRepository(session).update_fire(user_id=user_id, payload=response.model_dump())
    return response


def list_actions(session: Session, *, user_id: UUID) -> list[dict[str, Any]]:
    return [
        _serialize_action(action)
        for action in ActionRepository(session).list_for_user(user_id=user_id)
    ]


def update_action(
    session: Session,
    *,
    user_id: UUID,
    action_id: UUID,
    status: str | None = None,
    progress: int | None = None,
) -> dict[str, Any]:
    repository = ActionRepository(session)
    action = repository.get(action_id)
    if action is None or action.user_id != user_id:
        raise AnalysisInputError("Action not found.")
    if progress is not None and not 0 <= progress <= 100:
        raise AnalysisInputError("Action progress must be between 0 and 100.")
    repository.update(action, status=status, progress=progress)
    return _serialize_action(action)


def create_manual_action(
    session: Session,
    *,
    user_id: UUID,
    title: str,
    subtitle: str,
    impact: float,
    priority: str,
    action_text: str,
    status: str,
    progress: int,
) -> dict[str, Any]:
    if not 0 <= progress <= 100:
        raise AnalysisInputError("Action progress must be between 0 and 100.")
    action = ActionRepository(session).create(
        user_id=user_id,
        action_type="manual",
        status=status,
        progress=progress,
        details_json={
            "source": "manual",
            "title": title,
            "subtitle": subtitle,
            "impact": impact,
            "priority": priority,
            "action": action_text,
            "inferred": False,
        },
    )
    return _serialize_action(action)
