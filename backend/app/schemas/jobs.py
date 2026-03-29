from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ApiError

JobStatus = Literal["pending", "processing", "completed", "failed"]


class JobStatusResponse(BaseModel):
    job_id: UUID
    user_id: UUID
    type: str
    status: JobStatus
    result: dict[str, Any] | None = None
    error: ApiError | None = None
    created_at: datetime
    updated_at: datetime
