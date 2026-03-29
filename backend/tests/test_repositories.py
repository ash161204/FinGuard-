from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models import Base, Job, Profile, User
from app.repositories.job_repository import JobRepository
from app.services.bootstrap import bootstrap_demo_user


def build_test_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_bootstrap_demo_user_creates_user_and_profile() -> None:
    with build_test_session() as session:
        result = bootstrap_demo_user(session, "00000000-0000-0000-0000-000000000001")

        assert result.user_id == UUID("00000000-0000-0000-0000-000000000001")
        assert result.user_created is True
        assert result.profile_created is True
        assert session.get(User, result.user_id) is not None
        assert session.get(Profile, result.user_id) is not None


def test_bootstrap_demo_user_is_idempotent() -> None:
    with build_test_session() as session:
        first = bootstrap_demo_user(session, "00000000-0000-0000-0000-000000000001")
        second = bootstrap_demo_user(session, "00000000-0000-0000-0000-000000000001")

        assert first.user_created is True
        assert second.user_created is False
        assert second.profile_created is False


def test_job_repository_creates_pending_job() -> None:
    with build_test_session() as session:
        result = bootstrap_demo_user(session, "00000000-0000-0000-0000-000000000001")
        repository = JobRepository(session)

        job = repository.create(
            user_id=result.user_id,
            job_type="form16_upload",
            status="pending",
        )
        session.commit()

        stored_job = session.get(Job, job.job_id)
        assert stored_job is not None
        assert stored_job.status == "pending"
        assert stored_job.type == "form16_upload"
