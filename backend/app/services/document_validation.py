from dataclasses import dataclass
from typing import Any, Literal

from pydantic import ValidationError

from app.schemas.documents import (
    CamsReviewPayload,
    Form16ReviewPayload,
    ReviewValidationSummary,
)

DocumentType = Literal["form16", "cams"]


class DocumentValidationError(ValueError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


@dataclass(frozen=True)
class ValidatedDocument:
    document_type: DocumentType
    payload: dict[str, Any]
    summary: ReviewValidationSummary


def _sanitize_input(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    if isinstance(value, list):
        return [_sanitize_input(item) for item in value]
    if isinstance(value, dict):
        return {key: _sanitize_input(item) for key, item in value.items()}
    return value


def _build_validation_error(exc: ValidationError) -> DocumentValidationError:
    details = []
    for error in exc.errors():
        path = ".".join(str(part) for part in error["loc"])
        details.append(
            {
                "path": path,
                "message": error["msg"],
                "type": error["type"],
            }
        )
    return DocumentValidationError(
        "Reviewed document does not match the required schema.",
        details={"errors": details},
    )


def _validate_form16(data: dict[str, Any]) -> ValidatedDocument:
    try:
        payload = Form16ReviewPayload.model_validate(_sanitize_input(data)).model_dump(
            by_alias=True,
        )
    except ValidationError as exc:
        raise _build_validation_error(exc) from exc

    level_1 = payload["level_1"]
    deductions = level_1["deductions"]
    missing_fields: list[str] = []
    blocking_fields: list[str] = []

    core_field_paths = [
        ("level_1.salary", level_1["salary"]),
        ("level_1.hra_received", level_1["hra_received"]),
        ("level_1.rent_paid", level_1["rent_paid"]),
        ("level_1.tax_deducted", level_1["tax_deducted"]),
        ("level_1.deductions.80C", deductions["80C"]),
        ("level_1.deductions.80D", deductions["80D"]),
        ("level_1.deductions.80CCD1B", deductions["80CCD1B"]),
    ]
    for field_path, value in core_field_paths:
        if value is None:
            missing_fields.append(field_path)
            blocking_fields.append(field_path)

    for level_name in ("level_2", "level_3"):
        for field_name, value in payload[level_name].items():
            if value is None:
                missing_fields.append(f"{level_name}.{field_name}")

    critical_ready = not blocking_fields
    status: Literal["complete", "partial", "invalid"]
    if not missing_fields:
        status = "complete"
    elif critical_ready:
        status = "partial"
    else:
        status = "invalid"

    return ValidatedDocument(
        document_type="form16",
        payload=payload,
        summary=ReviewValidationSummary(
            status=status,
            critical_ready=critical_ready,
            missing_fields=missing_fields,
            blocking_fields=blocking_fields,
        ),
    )


def _validate_cams(data: dict[str, Any]) -> ValidatedDocument:
    try:
        payload = CamsReviewPayload.model_validate(_sanitize_input(data)).model_dump()
    except ValidationError as exc:
        raise _build_validation_error(exc) from exc

    missing_fields: list[str] = []
    blocking_fields: list[str] = []
    holdings = payload["holdings"]

    if not holdings:
        missing_fields.append("holdings")
        blocking_fields.append("holdings")
    else:
        for index, holding in enumerate(holdings):
            for field_name in ("fund_name", "invested", "current"):
                if holding[field_name] is None:
                    path = f"holdings[{index}].{field_name}"
                    missing_fields.append(path)
                    blocking_fields.append(path)
            for field_name in ("category", "purchase_date", "plan"):
                if holding[field_name] is None:
                    missing_fields.append(f"holdings[{index}].{field_name}")

    critical_ready = not blocking_fields
    status: Literal["complete", "partial", "invalid"]
    if not missing_fields:
        status = "complete"
    elif critical_ready:
        status = "partial"
    else:
        status = "invalid"

    return ValidatedDocument(
        document_type="cams",
        payload=payload,
        summary=ReviewValidationSummary(
            status=status,
            critical_ready=critical_ready,
            missing_fields=missing_fields,
            blocking_fields=blocking_fields,
        ),
    )


def validate_reviewed_document(
    *,
    document_type: DocumentType,
    data: dict[str, Any],
) -> ValidatedDocument:
    if document_type == "form16":
        return _validate_form16(data)
    if document_type == "cams":
        return _validate_cams(data)
    raise DocumentValidationError(f"Unsupported document type: {document_type}")
