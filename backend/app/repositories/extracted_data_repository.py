from collections.abc import Mapping
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExtractedData


class ExtractedDataRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, *, user_id: UUID, document_type: str, data_json: Mapping) -> ExtractedData:
        extracted = ExtractedData(
            user_id=user_id,
            type=document_type,
            data_json=dict(data_json),
        )
        self.session.add(extracted)
        self.session.flush()
        return extracted

    def get_latest(self, *, user_id: UUID, document_type: str) -> ExtractedData | None:
        statement = (
            select(ExtractedData)
            .where(
                ExtractedData.user_id == user_id,
                ExtractedData.type == document_type,
            )
            .order_by(ExtractedData.created_at.desc())
            .limit(1)
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_review(
        self,
        extracted: ExtractedData,
        *,
        reviewed_data_json: Mapping | None,
        review_status: str,
        review_metadata_json: Mapping | None = None,
    ) -> ExtractedData:
        extracted.reviewed_data_json = (
            dict(reviewed_data_json) if reviewed_data_json is not None else None
        )
        extracted.review_status = review_status
        extracted.review_metadata_json = (
            dict(review_metadata_json) if review_metadata_json is not None else {}
        )
        extracted.reviewed_at = datetime.now(UTC)
        self.session.add(extracted)
        self.session.flush()
        return extracted

    def update_review_metadata(
        self,
        extracted: ExtractedData,
        *,
        review_metadata_json: Mapping,
    ) -> ExtractedData:
        extracted.review_metadata_json = dict(review_metadata_json)
        self.session.add(extracted)
        self.session.flush()
        return extracted
