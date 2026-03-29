from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictSchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Form16DeductionsPayload(StrictSchemaModel):
    section_80c: float | None = Field(default=None, alias="80C", serialization_alias="80C")
    section_80d: float | None = Field(default=None, alias="80D", serialization_alias="80D")
    section_80ccd1b: float | None = Field(
        default=None,
        alias="80CCD1B",
        serialization_alias="80CCD1B",
    )


class Form16Level1Payload(StrictSchemaModel):
    salary: float | None = None
    hra_received: float | None = None
    rent_paid: float | None = None
    tax_deducted: float | None = None
    deductions: Form16DeductionsPayload = Field(default_factory=Form16DeductionsPayload)


class Form16Level2Payload(StrictSchemaModel):
    lta: float | None = None
    bonus: float | None = None
    other_allowances: float | None = None
    professional_tax: float | None = None


class Form16Level3Payload(StrictSchemaModel):
    previous_employer_income: float | None = None
    other_income: float | None = None
    losses: float | None = None


class Form16ReviewPayload(StrictSchemaModel):
    level_1: Form16Level1Payload = Field(default_factory=Form16Level1Payload)
    level_2: Form16Level2Payload = Field(default_factory=Form16Level2Payload)
    level_3: Form16Level3Payload = Field(default_factory=Form16Level3Payload)


class CamsTransactionPayload(StrictSchemaModel):
    date: str | None = None
    amount: float | None = None
    units: float | None = None
    nav: float | None = None


class CamsHoldingPayload(StrictSchemaModel):
    fund_name: str | None = None
    category: str | None = None
    invested: float | None = None
    current: float | None = None
    purchase_date: str | None = None
    plan: Literal["Direct", "Regular"] | None = None
    option: Literal["Growth", "Dividend"] | None = None
    units: float | None = None
    transactions: list[CamsTransactionPayload] = Field(default_factory=list)

    @field_validator("plan", mode="before")
    @classmethod
    def normalize_plan(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().lower()
        if not normalized:
            return None
        if "direct" in normalized:
            return "Direct"
        if "regular" in normalized:
            return "Regular"
        # If it's neither but has content (like just 'Growth'), treat as None
        # to allow partial extraction without 500 errors
        return None

    @field_validator("option", mode="before")
    @classmethod
    def normalize_option(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().lower()
        if not normalized:
            return None
        if "growth" in normalized:
            return "Growth"
        if "dividend" in normalized or "idcw" in normalized:
            return "Dividend"
        return None


class CamsReviewPayload(StrictSchemaModel):
    holdings: list[CamsHoldingPayload] = Field(default_factory=list)


class ReviewValidationSummary(BaseModel):
    status: Literal["complete", "partial", "invalid"]
    critical_ready: bool
    missing_fields: list[str] = Field(default_factory=list)
    blocking_fields: list[str] = Field(default_factory=list)


class ReviewedExtractionUpdateRequest(BaseModel):
    reviewed_data: dict[str, Any]
    review_status: Literal["pending", "completed"] = "completed"


class ReviewedExtractionResponse(BaseModel):
    document_id: UUID
    type: Literal["form16", "cams"]
    raw_extracted_data: dict[str, Any]
    reviewed_data: dict[str, Any]
    review_status: Literal["pending", "completed"]
    validation: ReviewValidationSummary
    normalized_data: dict[str, Any] | None = None
    review_metadata: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    created_at: datetime
    reviewed_at: datetime | None = None


class NormalizedDocumentResponse(BaseModel):
    user_id: UUID
    type: Literal["form16", "cams"]
    data: dict[str, Any]
    audit: dict[str, Any]
    updated_at: datetime
