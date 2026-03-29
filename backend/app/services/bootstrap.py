from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.profile_repository import ProfileRepository
from app.repositories.user_repository import UserRepository


@dataclass
class BootstrapResult:
    user_id: UUID
    user_created: bool
    profile_created: bool


def bootstrap_demo_user(session: Session, demo_user_id: str) -> BootstrapResult:
    user_repository = UserRepository(session)
    profile_repository = ProfileRepository(session)

    user_id = UUID(demo_user_id)
    user, user_created = user_repository.get_or_create(user_id)
    _, profile_created = profile_repository.get_or_create(user.id)
    session.commit()

    return BootstrapResult(
        user_id=user.id,
        user_created=user_created,
        profile_created=profile_created,
    )
