import logging
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.repositories.extracted_data_repository import ExtractedDataRepository
from app.repositories.job_repository import JobRepository
from app.schemas.common import ExtractionResult
from app.services.gemini_client import (
    GeminiClient,
    GeminiConfigurationError,
    GeminiExtractionError,
)
from app.services.ocr_service import OcrUnavailableError, extract_text_with_ocr
from app.services.pdf_text_extractor import PdfTextExtractionError, extract_pdf_text
from app.services.regex_extractors import extract_cams_candidates, extract_form16_candidates
from app.services.text_processing import clean_text, redact_pii

DocumentType = str


def _merge_dicts(base: dict[str, Any], override: Mapping[str, Any] | None) -> dict[str, Any]:
    if override is None:
        return dict(base)

    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, Mapping) and isinstance(merged.get(key), Mapping):
            merged[key] = _merge_dicts(dict(merged[key]), value)
        elif value is not None:
            merged[key] = value
    return merged


def _build_form16_result(
    data: dict[str, Any],
    regex_candidates: dict[str, Any],
    warnings: list[str],
    *,
    raw_text_available: bool,
) -> ExtractionResult:
    payload = {
        "level_1": {
            "salary": data.get("salary"),
            "hra_received": data.get("hra_received"),
            "rent_paid": data.get("rent_paid"),
            "tax_deducted": data.get("tax_deducted"),
            "deductions": {
                "80C": (data.get("deductions") or {}).get("80C"),
                "80D": (data.get("deductions") or {}).get("80D"),
                "80CCD1B": (data.get("deductions") or {}).get("80CCD1B"),
            },
        },
        "level_2": {
            "lta": data.get("lta"),
            "bonus": data.get("bonus"),
            "other_allowances": data.get("other_allowances"),
            "professional_tax": data.get("professional_tax"),
        },
        "level_3": {
            "previous_employer_income": data.get("previous_employer_income"),
            "other_income": data.get("other_income"),
            "losses": data.get("losses"),
        },
    }

    missing_fields = []
    core_field_paths = [
        ("salary", payload["level_1"]["salary"]),
        ("hra_received", payload["level_1"]["hra_received"]),
        ("rent_paid", payload["level_1"]["rent_paid"]),
        ("tax_deducted", payload["level_1"]["tax_deducted"]),
        ("deductions.80C", payload["level_1"]["deductions"]["80C"]),
        ("deductions.80D", payload["level_1"]["deductions"]["80D"]),
        ("deductions.80CCD1B", payload["level_1"]["deductions"]["80CCD1B"]),
    ]
    for field_path, value in core_field_paths:
        if value is None:
            missing_fields.append(field_path)

    for field_name, value in payload["level_2"].items():
        if value is None:
            missing_fields.append(f"level_2.{field_name}")
    for field_name, value in payload["level_3"].items():
        if value is None:
            missing_fields.append(f"level_3.{field_name}")

    critical_ready = len([field for field in missing_fields if not field.startswith("level_")]) == 0
    status = "complete" if not missing_fields else "partial" if critical_ready else "invalid"

    return ExtractionResult(
        type="form16",
        status=status,
        data=payload,
        missing_fields=missing_fields,
        warnings=warnings,
        critical_ready=critical_ready,
        raw_text_available=raw_text_available,
        regex_candidates=regex_candidates,
    )


def _build_cams_result(
    data: dict[str, Any],
    warnings: list[str],
    *,
    raw_text_available: bool,
) -> ExtractionResult:
    holdings = data.get("holdings") or []
    missing_fields: list[str] = []

    if not holdings:
        missing_fields.append("holdings")
        status = "invalid"
        critical_ready = False
    else:
        critical_ready = True
        for index, holding in enumerate(holdings):
            # Check critical fields
            for field_name in ("fund_name", "invested", "current"):
                if holding.get(field_name) is None:
                    missing_fields.append(f"holdings[{index}].{field_name}")
                    critical_ready = False
            
            # Additional validation logic for non-critical parts
            if not holding.get("transactions") and not holding.get("current"):
                missing_fields.append(f"holdings[{index}].transactions")

        status = "complete" if not missing_fields else "partial" if critical_ready else "invalid"

    return ExtractionResult(
        type="cams",
        status=status,
        data={"holdings": holdings},
        missing_fields=missing_fields,
        warnings=warnings,
        critical_ready=critical_ready,
        raw_text_available=raw_text_available,
        regex_candidates={}, # Deprecated but maintaining type
    )


async def extract_document(
    *,
    document_type: DocumentType,
    file_path: Path,
    gemini_client: GeminiClient | None = None,
) -> ExtractionResult:
    settings = get_settings()
    warnings: list[str] = []

    try:
        extracted_text = extract_pdf_text(file_path)
    except PdfTextExtractionError as exc:
        warnings.append(str(exc))
        extracted_text = ""

    if not extracted_text.strip():
        try:
            extracted_text = extract_text_with_ocr(file_path, lang=settings.ocr_lang)
            warnings.append("Used OCR fallback because direct PDF text extraction was empty.")
        except OcrUnavailableError as exc:
            warnings.append(str(exc))

    cleaned_text = clean_text(extracted_text)
    redacted_text = redact_pii(cleaned_text)
    if document_type == "cams":
        structured_data = extract_cams_candidates(cleaned_text)
        
        fund_names = [h["fund_name"] for h in structured_data.get("holdings", []) if h.get("fund_name")]
        if fund_names:
            client = gemini_client or GeminiClient()
            try:
                normalized_funds = await client.normalize_cams_funds(fund_names)
                # Map back the values based on original_name match
                norm_map = {item["original_name"]: item for item in normalized_funds if item.get("original_name")}
                for holding in structured_data.get("holdings", []):
                    raw_fn = holding.get("fund_name")
                    if raw_fn in norm_map:
                        norm = norm_map[raw_fn]
                        if norm.get("fund_name"):
                            holding["fund_name"] = norm["fund_name"]
                        if norm.get("category"):
                            holding["category"] = norm["category"]
                        if norm.get("plan") and not holding.get("plan"):
                            holding["plan"] = norm["plan"]
                        if norm.get("option") and not holding.get("option"):
                            holding["option"] = norm["option"]
            except (GeminiConfigurationError, GeminiExtractionError) as exc:
                warnings.append(f"Gemini normalization failed: {exc}")

        return _build_cams_result(
            structured_data,
            warnings,
            raw_text_available=bool(cleaned_text),
        )

    # Path for form16 processing
    regex_candidates = extract_form16_candidates(cleaned_text)

    client = gemini_client or GeminiClient()
    structured_data: dict[str, Any] | None = None
    for attempt in range(2):
        try:
            structured_data = await client.structure_document(
                document_type=document_type,
                cleaned_text=redacted_text,
                regex_candidates=regex_candidates,
            )
            break
        except GeminiConfigurationError as exc:
            warnings.append(str(exc))
            break
        except GeminiExtractionError as exc:
            warnings.append(
                f"Gemini structuring attempt {attempt + 1} failed: {exc}"
            )
            if attempt == 1:
                warnings.append("Falling back to regex-only extraction.")

    merged = _merge_dicts(regex_candidates, structured_data)

    return _build_form16_result(
        merged,
        regex_candidates,
        warnings,
        raw_text_available=bool(cleaned_text),
    )


async def process_upload_job(
    *,
    session_factory: Callable[[], Session],
    job_id: UUID,
    user_id: UUID,
    document_type: DocumentType,
    file_path: Path,
) -> None:
    logging.info(f"Processing upload job {job_id}", extra={"job_id": job_id})
    with session_factory() as session:
        jobs = JobRepository(session)
        job = jobs.get(job_id)
        if job is None:
            logging.error(f"Job {job_id} not found.", extra={"job_id": job_id})
            return
        jobs.update(job, status="processing", error=None)
        session.commit()

    try:
        result = await extract_document(document_type=document_type, file_path=file_path)
    except Exception as exc:
        logging.exception(f"Job {job_id} failed: {exc}", extra={"job_id": job_id})
        with session_factory() as session:
            jobs = JobRepository(session)
            job = jobs.get(job_id)
            if job is None:
                return
            jobs.update(
                job,
                status="failed",
                error={
                    "code": "extraction_failed",
                    "message": str(exc),
                    "type": exc.__class__.__name__,
                },
            )
            session.commit()
        return

    result_payload = result.model_dump()
    with session_factory() as session:
        jobs = JobRepository(session)
        extracted_repo = ExtractedDataRepository(session)
        job = jobs.get(job_id)
        if job is None:
            return
        extracted_repo.create(
            user_id=user_id,
            document_type=document_type,
            data_json={
                **result_payload,
                "source_file_path": str(file_path),
            },
        )
        jobs.update(job, status="completed", result_json=result_payload, error=None)
        session.commit()
        logging.info(f"Job {job_id} completed successfully.", extra={"job_id": job_id})


def build_session_factory_for_background() -> sessionmaker[Session]:
    bind = SessionLocal.kw["bind"]
    return sessionmaker(bind=bind, autoflush=False, autocommit=False, expire_on_commit=False)
