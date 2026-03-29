from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.services.document_validation import (
    DocumentType,
    ValidatedDocument,
    validate_reviewed_document,
)

FIELD_MAP = {
    "gross_salary": "salary",
    "total_income": "salary",
    "salary_income": "salary",
    "hra": "hra_received",
    "house_rent_allowance": "hra_received",
    "invested_amount": "invested",
    "amount_invested": "invested",
    "current_value": "current",
    "market_value": "current",
}

DATE_FORMATS = (
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%d %b %Y",
    "%d %B %Y",
)


@dataclass(frozen=True)
class NormalizationResult:
    document_type: DocumentType
    data: dict[str, Any]
    audit: dict[str, Any]


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace(",", "").replace("₹", "").strip()
        if not cleaned:
            return None
        return float(cleaned)
    raise ValueError(f"Value {value!r} cannot be converted to float.")


def _normalize_date(value: Any) -> tuple[str | None, bool]:
    if value is None:
        return None, False
    if isinstance(value, datetime):
        return value.date().isoformat(), True
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None, False
        for date_format in DATE_FORMATS:
            try:
                return datetime.strptime(candidate, date_format).date().isoformat(), True
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(candidate).date().isoformat(), True
        except ValueError:
            return candidate, False
    return str(value), False


def _canonical_plan(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("plan must be a string or null")
    normalized = value.strip().lower()
    if not normalized:
        return None
    if normalized == "direct":
        return "Direct"
    if normalized == "regular":
        return "Regular"
    return value


def _normalize_form16(validated: ValidatedDocument) -> NormalizationResult:
    level_1 = validated.payload["level_1"]
    level_2 = validated.payload["level_2"]
    level_3 = validated.payload["level_3"]

    mapped_fields: list[dict[str, str]] = []
    numeric_fields: list[str] = []

    normalized = {
        "salary": _to_float(level_1["salary"]),
        "basic": None,
        "hra_received": _to_float(level_1["hra_received"]),
        "rent_paid": _to_float(level_1["rent_paid"]),
        "tax_deducted": _to_float(level_1["tax_deducted"]),
        "deductions": {
            "80C": _to_float(level_1["deductions"]["80C"]),
            "80D": _to_float(level_1["deductions"]["80D"]),
            "80CCD1B": _to_float(level_1["deductions"]["80CCD1B"]),
        },
        "lta": _to_float(level_2["lta"]),
        "bonus": _to_float(level_2["bonus"]),
        "other_allowances": _to_float(level_2["other_allowances"]),
        "professional_tax": _to_float(level_2["professional_tax"]),
        "previous_employer_income": _to_float(level_3["previous_employer_income"]),
        "other_income": _to_float(level_3["other_income"]),
        "losses": _to_float(level_3["losses"]),
    }

    for field_name, value in {
        "salary": normalized["salary"],
        "hra_received": normalized["hra_received"],
        "rent_paid": normalized["rent_paid"],
        "tax_deducted": normalized["tax_deducted"],
        "deductions.80C": normalized["deductions"]["80C"],
        "deductions.80D": normalized["deductions"]["80D"],
        "deductions.80CCD1B": normalized["deductions"]["80CCD1B"],
        "lta": normalized["lta"],
        "bonus": normalized["bonus"],
        "other_allowances": normalized["other_allowances"],
        "professional_tax": normalized["professional_tax"],
        "previous_employer_income": normalized["previous_employer_income"],
        "other_income": normalized["other_income"],
        "losses": normalized["losses"],
    }.items():
        if value is not None:
            numeric_fields.append(field_name)

    for source_key, target_key in FIELD_MAP.items():
        if source_key in validated.payload:
            mapped_fields.append({"from": source_key, "to": target_key})

    return NormalizationResult(
        document_type="form16",
        data=normalized,
        audit={
            "document_type": "form16",
            "field_map_hits": mapped_fields,
            "numeric_fields_normalized": numeric_fields,
            "date_fields_normalized": [],
            "validation": validated.summary.model_dump(),
            "normalized_at": datetime.now(UTC).isoformat(),
        },
    )


def _normalize_cams(validated: ValidatedDocument) -> NormalizationResult:
    holdings: list[dict[str, Any]] = []
    numeric_fields: list[str] = []
    date_fields: list[str] = []
    mapped_fields: list[dict[str, str]] = []

    for index, holding in enumerate(validated.payload["holdings"]):
        mapped = {FIELD_MAP.get(key, key): value for key, value in holding.items()}
        for source_key, target_key in FIELD_MAP.items():
            if source_key in holding:
                mapped_fields.append({"from": source_key, "to": target_key})

        invested = _to_float(mapped.get("invested"))
        current = _to_float(mapped.get("current"))
        purchase_date, date_normalized = _normalize_date(mapped.get("purchase_date"))
        plan = _canonical_plan(mapped.get("plan"))
        normalized_holding = {
            "fund_name": mapped.get("fund_name"),
            "category": mapped.get("category"),
            "invested": invested,
            "current": current,
            "purchase_date": purchase_date,
            "plan": plan,
        }
        holdings.append(normalized_holding)
        if invested is not None:
            numeric_fields.append(f"holdings[{index}].invested")
        if current is not None:
            numeric_fields.append(f"holdings[{index}].current")
        if date_normalized and purchase_date is not None:
            date_fields.append(f"holdings[{index}].purchase_date")

    return NormalizationResult(
        document_type="cams",
        data={"holdings": holdings},
        audit={
            "document_type": "cams",
            "field_map_hits": mapped_fields,
            "numeric_fields_normalized": numeric_fields,
            "date_fields_normalized": date_fields,
            "validation": validated.summary.model_dump(),
            "normalized_at": datetime.now(UTC).isoformat(),
        },
    )


def normalize_document(*, document_type: DocumentType, data: dict[str, Any]) -> NormalizationResult:
    validated = validate_reviewed_document(document_type=document_type, data=data)
    if document_type == "form16":
        return _normalize_form16(validated)
    if document_type == "cams":
        return _normalize_cams(validated)
    raise ValueError(f"Unsupported document type: {document_type}")
