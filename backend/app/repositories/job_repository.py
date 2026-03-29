from collections.abc import Mapping
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Job


class JobRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(
        self,
        *,
        user_id: UUID,
        job_type: str,
        status: str = "pending",
        result_json: Mapping | None = None,
        error: Mapping | None = None,
    ) -> Job:
        job = Job(
            user_id=user_id,
            type=job_type,
            status=status,
            result_json=dict(result_json) if result_json is not None else None,
            error=dict(error) if error is not None else None,
        )
        self.session.add(job)
        self.session.flush()
        return job

    def get(self, job_id: UUID) -> Job | None:
        return self.session.get(Job, job_id)

    def update(
        self,
        job: Job,
        *,
        status: str | None = None,
        result_json: Mapping | None = None,
        error: Mapping | None = None,
    ) -> Job:
        if status is not None:
            job.status = status
        if result_json is not None:
            job.result_json = dict(result_json)
        if error is not None:
            job.error = dict(error)
        self.session.add(job)
        self.session.flush()
        return job
