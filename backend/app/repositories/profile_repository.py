from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Profile


class ProfileRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_user_id(self, user_id: UUID) -> Profile | None:
        return self.session.get(Profile, user_id)

    def get_or_create(
        self,
        user_id: UUID,
        *,
        income: float = 0,
        expenses: float = 0,
        goals_json: dict | None = None,
    ) -> tuple[Profile, bool]:
        profile = self.get_by_user_id(user_id)
        if profile is not None:
            return profile, False

        profile = Profile(
            user_id=user_id,
            income=income,
            expenses=expenses,
            goals_json=goals_json or {},
        )
        self.session.add(profile)
        self.session.flush()
        return profile, True

    def update(
        self,
        profile: Profile,
        *,
        income: float | None = None,
        expenses: float | None = None,
        goals_json: dict | None = None,
    ) -> Profile:
        if income is not None:
            profile.income = income
        if expenses is not None:
            profile.expenses = expenses
        if goals_json is not None:
            profile.goals_json = dict(goals_json)
        self.session.add(profile)
        self.session.flush()
        return profile
