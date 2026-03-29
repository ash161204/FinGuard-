from typing import Any

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorEnvelope(BaseModel):
    error: ApiError


class ExtractionResult(BaseModel):
    type: str
    status: str
    data: dict[str, Any]
    missing_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    critical_ready: bool | None = None
    raw_text_available: bool = False
    regex_candidates: dict[str, Any] = Field(default_factory=dict)

