from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.repositories.job_repository import JobRepository
from app.schemas.common import ApiError
from app.schemas.jobs import JobStatusResponse

router = APIRouter()
SESSION_DEPENDENCY = Depends(get_session)


@router.get("/job/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: UUID,
    session: Session = SESSION_DEPENDENCY,
) -> JobStatusResponse:
    repository = JobRepository(session)
    job = repository.get(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiError(code="job_not_found", message="Job not found.").model_dump(),
        )

    return JobStatusResponse(
        job_id=job.job_id,
        user_id=job.user_id,
        type=job.type,
        status=job.status,
        result=job.result_json,
        error=job.error,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )
