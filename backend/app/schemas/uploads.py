from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class UploadAcceptedResponse(BaseModel):
    job_id: UUID
    status: Literal["pending", "processing", "completed", "failed"]
    type: str
    filename: str
