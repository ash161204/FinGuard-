from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_session
from app.schemas.analysis import (
    FireRequest,
    FireResponse,
    MfAnalysisRequest,
    MfAnalysisResponse,
    ScoreRequest,
    ScoreResponse,
    TaxAnalysisResponse,
)
from app.schemas.common import ApiError
from app.services.analysis import (
    AnalysisInputError,
    analyze_mf,
    analyze_tax,
    build_fire_plan,
    score_user,
)

router = APIRouter()
SESSION_DEPENDENCY = Depends(get_session)


def _demo_user_id() -> UUID:
    return UUID(get_settings().demo_user_id)


def _analysis_error(exc: AnalysisInputError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=ApiError(
            code="analysis_blocked",
            message=str(exc),
            details=exc.details,
        ).model_dump(),
    )


@router.post("/analyze/tax", response_model=TaxAnalysisResponse)
async def run_tax_analysis(
    session: Session = SESSION_DEPENDENCY,
) -> TaxAnalysisResponse:
    try:
        response = await analyze_tax(session, user_id=_demo_user_id())
    except AnalysisInputError as exc:
        raise _analysis_error(exc) from exc
    session.commit()
    return response


@router.post("/analyze/mf", response_model=MfAnalysisResponse)
async def run_mf_analysis(
    request: MfAnalysisRequest | None = None,
    session: Session = SESSION_DEPENDENCY,
) -> MfAnalysisResponse:
    try:
        response = await analyze_mf(session, user_id=_demo_user_id(), request=request)
    except AnalysisInputError as exc:
        raise _analysis_error(exc) from exc
    session.commit()
    return response


@router.post("/score", response_model=ScoreResponse)
async def run_score(
    request: ScoreRequest,
    session: Session = SESSION_DEPENDENCY,
) -> ScoreResponse:
    try:
        response = await score_user(session, user_id=_demo_user_id(), request=request)
    except AnalysisInputError as exc:
        raise _analysis_error(exc) from exc
    session.commit()
    return response


@router.post("/fire", response_model=FireResponse)
async def run_fire(
    request: FireRequest,
    session: Session = SESSION_DEPENDENCY,
) -> FireResponse:
    try:
        response = build_fire_plan(session, user_id=_demo_user_id(), request=request)
    except AnalysisInputError as exc:
        raise _analysis_error(exc) from exc
    session.commit()
    return response
