from collections.abc import Mapping
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import DerivedData


class DerivedDataRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, user_id: UUID) -> DerivedData | None:
        return self.session.get(DerivedData, user_id)

    def get_or_create(self, user_id: UUID) -> tuple[DerivedData, bool]:
        derived = self.get(user_id)
        if derived is not None:
            return derived, False

        derived = DerivedData(
            user_id=user_id,
            tax_report_json={},
            mf_report_json={},
            score_json={},
            fire_json={},
        )
        self.session.add(derived)
        self.session.flush()
        return derived, True

    def update_tax_report(self, *, user_id: UUID, payload: Mapping) -> DerivedData:
        derived, _ = self.get_or_create(user_id)
        derived.tax_report_json = dict(payload)
        self.session.add(derived)
        self.session.flush()
        return derived

    def update_mf_report(self, *, user_id: UUID, payload: Mapping) -> DerivedData:
        derived, _ = self.get_or_create(user_id)
        derived.mf_report_json = dict(payload)
        self.session.add(derived)
        self.session.flush()
        return derived

    def update_score(self, *, user_id: UUID, payload: Mapping) -> DerivedData:
        derived, _ = self.get_or_create(user_id)
        derived.score_json = dict(payload)
        self.session.add(derived)
        self.session.flush()
        return derived

    def update_fire(self, *, user_id: UUID, payload: Mapping) -> DerivedData:
        derived, _ = self.get_or_create(user_id)
        derived.fire_json = dict(payload)
        self.session.add(derived)
        self.session.flush()
        return derived
