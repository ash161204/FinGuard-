from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ScoreHistory


class ScoreHistoryRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, *, user_id: UUID, score: float) -> ScoreHistory:
        entry = ScoreHistory(user_id=user_id, score=score)
        self.session.add(entry)
        self.session.flush()
        return entry

    def get_latest(self, *, user_id: UUID) -> ScoreHistory | None:
        statement = (
            select(ScoreHistory)
            .where(ScoreHistory.user_id == user_id)
            .order_by(ScoreHistory.timestamp.desc())
            .limit(1)
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_recent(self, *, user_id: UUID, limit: int = 10) -> list[ScoreHistory]:
        statement = (
            select(ScoreHistory)
            .where(ScoreHistory.user_id == user_id)
            .order_by(ScoreHistory.timestamp.desc())
            .limit(limit)
        )
        return list(self.session.execute(statement).scalars())
