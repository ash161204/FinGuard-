from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.session import get_session
from app.repositories.job_repository import JobRepository
from app.schemas.common import ApiError
from app.schemas.uploads import UploadAcceptedResponse
from app.services.extraction_pipeline import process_upload_job
from app.services.storage import StoredUpload, store_upload_file

router = APIRouter()
SESSION_DEPENDENCY = Depends(get_session)
UPLOAD_DEPENDENCY = File(...)


def _validate_upload(upload_file: UploadFile) -> None:
    settings = get_settings()
    filename = upload_file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiError(
                code="invalid_file_type",
                message="Only PDF uploads are supported.",
            ).model_dump(),
        )
    if upload_file.content_type not in {"application/pdf", "application/octet-stream", None}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiError(
                code="invalid_content_type",
                message="Expected a PDF content type.",
            ).model_dump(),
        )
    if (upload_file.size or 0) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiError(
                code="file_too_large",
                message="Uploaded file exceeds the configured size limit.",
            ).model_dump(),
        )


async def _enqueue_upload(
    *,
    document_type: str,
    upload_file: UploadFile,
    background_tasks: BackgroundTasks,
    session: Session,
) -> UploadAcceptedResponse:
    _validate_upload(upload_file)
    settings = get_settings()
    repository = JobRepository(session)
    job = repository.create(user_id=UUID(settings.demo_user_id), job_type=f"{document_type}_upload")
    session.commit()

    stored_upload: StoredUpload = await store_upload_file(
        upload_file,
        base_dir=settings.upload_path,
        document_type=document_type,
        job_id=job.job_id,
    )
    session_factory = sessionmaker(
        bind=session.get_bind(),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    background_tasks.add_task(
        process_upload_job,
        session_factory=session_factory,
        job_id=job.job_id,
        user_id=UUID(settings.demo_user_id),
        document_type=document_type,
        file_path=Path(stored_upload.path),
    )

    return UploadAcceptedResponse(
        job_id=job.job_id,
        status=job.status,
        type=job.type,
        filename=stored_upload.filename,
    )


@router.post(
    "/upload/form16",
    response_model=UploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_form16(
    background_tasks: BackgroundTasks,
    file: UploadFile = UPLOAD_DEPENDENCY,
    session: Session = SESSION_DEPENDENCY,
) -> UploadAcceptedResponse:
    return await _enqueue_upload(
        document_type="form16",
        upload_file=file,
        background_tasks=background_tasks,
        session=session,
    )


@router.post(
    "/upload/cams",
    response_model=UploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_cams(
    background_tasks: BackgroundTasks,
    file: UploadFile = UPLOAD_DEPENDENCY,
    session: Session = SESSION_DEPENDENCY,
) -> UploadAcceptedResponse:
    return await _enqueue_upload(
        document_type="cams",
        upload_file=file,
        background_tasks=background_tasks,
        session=session,
    )
