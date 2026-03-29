from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_session
from app.schemas.analysis import ActionResponse, ActionUpdateRequest, ManualActionCreateRequest
from app.schemas.common import ApiError
from app.services.analysis import (
    AnalysisInputError,
    create_manual_action,
    list_actions,
    update_action,
)

router = APIRouter()
SESSION_DEPENDENCY = Depends(get_session)


def _demo_user_id() -> UUID:
    return UUID(get_settings().demo_user_id)


def _action_error(exc: AnalysisInputError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=ApiError(
            code="action_error",
            message=str(exc),
            details=exc.details,
        ).model_dump(),
    )


@router.get("/actions", response_model=list[ActionResponse])
async def get_actions(session: Session = SESSION_DEPENDENCY) -> list[ActionResponse]:
    return list_actions(session, user_id=_demo_user_id())


@router.post("/actions", response_model=ActionResponse, status_code=status.HTTP_201_CREATED)
async def create_action(
    request: ManualActionCreateRequest,
    session: Session = SESSION_DEPENDENCY,
) -> ActionResponse:
    try:
        response = create_manual_action(
            session,
            user_id=_demo_user_id(),
            title=request.title,
            subtitle=request.subtitle,
            impact=request.impact,
            priority=request.priority,
            action_text=request.action,
            status=request.status,
            progress=request.progress,
        )
    except AnalysisInputError as exc:
        raise _action_error(exc) from exc
    session.commit()
    return response


@router.patch("/actions/{action_id}", response_model=ActionResponse)
async def patch_action(
    action_id: UUID,
    request: ActionUpdateRequest,
    session: Session = SESSION_DEPENDENCY,
) -> ActionResponse:
    try:
        response = update_action(
            session,
            user_id=_demo_user_id(),
            action_id=action_id,
            status=request.status,
            progress=request.progress,
        )
    except AnalysisInputError as exc:
        message = str(exc)
        if message == "Action not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ApiError(code="action_not_found", message=message).model_dump(),
            ) from exc
        raise _action_error(exc) from exc
    session.commit()
    return response
