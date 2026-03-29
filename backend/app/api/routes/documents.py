from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_session
from app.repositories.extracted_data_repository import ExtractedDataRepository
from app.repositories.normalized_profile_repository import NormalizedProfileRepository
from app.schemas.common import ApiError
from app.schemas.documents import (
    NormalizedDocumentResponse,
    ReviewedExtractionResponse,
    ReviewedExtractionUpdateRequest,
)
from app.services.document_validation import DocumentValidationError, validate_reviewed_document
from app.services.normalization import normalize_document

router = APIRouter()
SESSION_DEPENDENCY = Depends(get_session)
DocumentType = Literal["form16", "cams"]


def _demo_user_id() -> UUID:
    return UUID(get_settings().demo_user_id)


def _get_latest_document(
    session: Session,
    *,
    document_type: DocumentType,
):
    repository = ExtractedDataRepository(session)
    document = repository.get_latest(user_id=_demo_user_id(), document_type=document_type)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiError(
                code="document_not_found",
                message=f"No {document_type} document is available for review.",
            ).model_dump(),
        )
    return document


def _review_source_data(document) -> dict:
    raw_payload = dict((document.data_json or {}).get("data") or {})
    return dict(document.reviewed_data_json or raw_payload)


def _review_response(
    *,
    session: Session,
    document,
    document_type: DocumentType,
) -> ReviewedExtractionResponse:
    source_data = _review_source_data(document)
    validation = validate_reviewed_document(document_type=document_type, data=source_data)
    normalized_repo = NormalizedProfileRepository(session)
    normalized_profile = normalized_repo.get(document.user_id)
    normalized_data = None
    if normalized_profile is not None:
        normalized_data = (normalized_profile.data_json or {}).get(document_type)

    return ReviewedExtractionResponse(
        document_id=document.id,
        type=document_type,
        raw_extracted_data=dict((document.data_json or {}).get("data") or {}),
        reviewed_data=source_data,
        review_status=document.review_status,
        validation=validation.summary,
        normalized_data=normalized_data,
        review_metadata=dict(document.review_metadata_json or {}),
        warnings=list((document.data_json or {}).get("warnings") or []),
        created_at=document.created_at,
        reviewed_at=document.reviewed_at,
    )


@router.get(
    "/extractions/{document_type}/latest",
    response_model=ReviewedExtractionResponse,
)
async def get_latest_extraction(
    document_type: DocumentType,
    session: Session = SESSION_DEPENDENCY,
) -> ReviewedExtractionResponse:
    document = _get_latest_document(session, document_type=document_type)
    return _review_response(session=session, document=document, document_type=document_type)


@router.put(
    "/extractions/{document_type}/review",
    response_model=ReviewedExtractionResponse,
)
async def update_reviewed_extraction(
    document_type: DocumentType,
    request: ReviewedExtractionUpdateRequest,
    session: Session = SESSION_DEPENDENCY,
) -> ReviewedExtractionResponse:
    document = _get_latest_document(session, document_type=document_type)
    repository = ExtractedDataRepository(session)

    try:
        validated = validate_reviewed_document(
            document_type=document_type,
            data=request.reviewed_data,
        )
    except DocumentValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ApiError(
                code="invalid_review_payload",
                message=str(exc),
                details=exc.details,
            ).model_dump(),
        ) from exc

    if request.review_status == "completed" and not validated.summary.critical_ready:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ApiError(
                code="review_incomplete",
                message="Level 1 tax fields or required CAMS fields are still missing.",
                details={
                    "blocking_fields": validated.summary.blocking_fields,
                    "missing_fields": validated.summary.missing_fields,
                },
            ).model_dump(),
        )

    review_metadata = {
        "validation": validated.summary.model_dump(),
        "last_review_source": "manual_update",
    }
    repository.update_review(
        document,
        reviewed_data_json=validated.payload,
        review_status=request.review_status,
        review_metadata_json=review_metadata,
    )
    session.commit()
    session.refresh(document)

    return _review_response(session=session, document=document, document_type=document_type)


@router.post(
    "/extractions/{document_type}/normalize",
    response_model=NormalizedDocumentResponse,
)
async def normalize_latest_extraction(
    document_type: DocumentType,
    session: Session = SESSION_DEPENDENCY,
) -> NormalizedDocumentResponse:
    document = _get_latest_document(session, document_type=document_type)
    source_data = _review_source_data(document)

    try:
        normalized = normalize_document(document_type=document_type, data=source_data)
    except DocumentValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ApiError(
                code="normalization_blocked",
                message="Document cannot be normalized until required fields are available.",
                details=exc.details,
            ).model_dump(),
        ) from exc

    if not normalized.audit["validation"]["critical_ready"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ApiError(
                code="normalization_blocked",
                message="Document cannot be normalized until required fields are available.",
                details=normalized.audit["validation"],
            ).model_dump(),
        )

    normalized_repo = NormalizedProfileRepository(session)
    stored = normalized_repo.upsert_document(
        user_id=document.user_id,
        document_type=document_type,
        data_json=normalized.data,
        audit_json={
            **normalized.audit,
            "source_document_id": str(document.id),
            "review_status": document.review_status,
        },
    )
    review_metadata = dict(document.review_metadata_json or {})
    review_metadata["last_normalized_at"] = stored.updated_at.isoformat()
    review_metadata["last_normalized_type"] = document_type
    ExtractedDataRepository(session).update_review_metadata(
        document,
        review_metadata_json=review_metadata,
    )
    session.commit()
    session.refresh(stored)

    return NormalizedDocumentResponse(
        user_id=stored.user_id,
        type=document_type,
        data=dict((stored.data_json or {}).get(document_type) or {}),
        audit=dict((stored.audit_json or {}).get(document_type) or {}),
        updated_at=stored.updated_at,
    )
