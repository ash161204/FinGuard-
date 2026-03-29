from collections.abc import Mapping
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import NormalizedProfile


class NormalizedProfileRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, user_id: UUID) -> NormalizedProfile | None:
        return self.session.get(NormalizedProfile, user_id)

    def get_or_create(self, user_id: UUID) -> tuple[NormalizedProfile, bool]:
        profile = self.get(user_id)
        if profile is not None:
            return profile, False

        profile = NormalizedProfile(user_id=user_id, data_json={}, audit_json={})
        self.session.add(profile)
        self.session.flush()
        return profile, True

    def upsert_document(
        self,
        *,
        user_id: UUID,
        document_type: str,
        data_json: Mapping,
        audit_json: Mapping,
    ) -> NormalizedProfile:
        profile, _ = self.get_or_create(user_id)
        stored_data = dict(profile.data_json or {})
        stored_audit = dict(profile.audit_json or {})
        stored_data[document_type] = dict(data_json)
        stored_audit[document_type] = dict(audit_json)
        profile.data_json = stored_data
        profile.audit_json = stored_audit
        self.session.add(profile)
        self.session.flush()
        return profile
