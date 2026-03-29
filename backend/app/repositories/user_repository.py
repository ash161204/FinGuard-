from uuid import UUID

from sqlalchemy.orm import Session

from app.models import User


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, user_id: UUID) -> User | None:
        return self.session.get(User, user_id)

    def get_or_create(self, user_id: UUID) -> tuple[User, bool]:
        user = self.get(user_id)
        if user is not None:
            return user, False

        user = User(id=user_id)
        self.session.add(user)
        self.session.flush()
        return user, True
