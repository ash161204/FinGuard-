from collections.abc import Mapping
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Action


class ActionRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(
        self,
        *,
        user_id: UUID,
        action_type: str,
        status: str = "pending",
        progress: int = 0,
        details_json: Mapping | None = None,
    ) -> Action:
        action = Action(
            user_id=user_id,
            action_type=action_type,
            status=status,
            progress=progress,
            details_json=dict(details_json or {}),
        )
        self.session.add(action)
        self.session.flush()
        return action

    def get(self, action_id: UUID) -> Action | None:
        return self.session.get(Action, action_id)

    def list_for_user(
        self,
        *,
        user_id: UUID,
        include_archived: bool = False,
    ) -> list[Action]:
        statement = select(Action).where(Action.user_id == user_id)
        if not include_archived:
            statement = statement.where(Action.status != "archived")
        statement = statement.order_by(Action.updated_at.desc(), Action.created_at.desc())
        return list(self.session.execute(statement).scalars())

    def list_for_source(self, *, user_id: UUID, source: str) -> list[Action]:
        actions = self.list_for_user(user_id=user_id, include_archived=True)
        return [action for action in actions if (action.details_json or {}).get("source") == source]

    def find_by_source_key(self, *, user_id: UUID, source_key: str) -> Action | None:
        actions = self.list_for_user(user_id=user_id, include_archived=True)
        for action in actions:
            if (action.details_json or {}).get("source_key") == source_key:
                return action
        return None

    def update(
        self,
        action: Action,
        *,
        status: str | None = None,
        progress: int | None = None,
        details_json: Mapping | None = None,
        action_type: str | None = None,
    ) -> Action:
        if status is not None:
            action.status = status
        if progress is not None:
            action.progress = progress
        if details_json is not None:
            action.details_json = dict(details_json)
        if action_type is not None:
            action.action_type = action_type
        self.session.add(action)
        self.session.flush()
        return action
