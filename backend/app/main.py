import asyncio
import json
import logging
import math
import os
import re
import time
from collections import deque
from json import JSONDecodeError
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Tuple

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import APIConnectionError, APIStatusError, AsyncGroq, RateLimitError
from tenacity import before_sleep_log, retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential

from app.services.extractor import PDFExtractionError, clean_extracted_text, extract_text_from_pdf

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]

if load_dotenv:
    load_dotenv(PROJECT_ROOT / ".env", override=False)
    load_dotenv(BACKEND_ROOT / ".env", override=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("groq-document-parser")

MODEL_NAME = "llama-3.3-70b-versatile"
RPM_LIMIT = 30
TPM_LIMIT = 12_000
MIN_SECONDS_BETWEEN_CALLS = 2.0
MAX_COMPLETION_TOKENS = 1_800
TPM_BUFFER = 500

SYSTEM_PROMPT = """
You are a financial document intelligence engine.
Your job is to convert cleaned, extracted text from financial documents into a single, detailed JSON object.
Return only valid JSON and nothing else. Do not use markdown, code fences, explanations, or prose.

Follow these rules exactly:
1. Infer the likely document type when possible. Allowed values: form16, bank_statement, mutual_fund_statement, ca_camps, tax_notice, salary_slip, invoice, unknown.
2. Extract only facts that are explicitly supported by the input text.
3. Never hallucinate values. If a value is missing, use an empty string for scalar fields, [] for arrays, and {} only when required by the schema.
4. Preserve identifiers and monetary values as they appear in the source whenever possible.
5. Keep transaction rows in source order.
6. Summaries and key points must be concise and evidence-based.
7. If the document is a CAMS, KFintech, CAS, or mutual-fund portfolio statement, prioritize extracting scheme-wise holdings into the holdings array.
8. For mutual-fund statements, fill holdings with one row per scheme whenever the text supports it. Include fund_name, category, invested_amount, current_value, purchase_date, plan, folio_number, units, nav, and amc when present.
9. For mutual-fund statements, use the earliest clearly supported purchase or allotment date for purchase_date. Do not invent dates.
10. If both holdings and transactions are present, return both.

Return JSON using this exact top-level structure:
{
  "document_type": "",
  "summary": "",
  "parties": {
    "employee_name": "",
    "employer_name": "",
    "client_name": "",
    "account_holder": "",
    "bank_name": ""
  },
  "identifiers": {
    "pan": "",
    "tan": "",
    "account_number": "",
    "ifsc": "",
    "customer_id": ""
  },
  "periods": {
    "assessment_year": "",
    "financial_year": "",
    "statement_period": "",
    "issue_date": ""
  },
  "financials": {
    "gross_salary": "",
    "total_income": "",
    "tax_deducted": "",
    "fees": "",
    "opening_balance": "",
    "closing_balance": "",
    "total_debits": "",
    "total_credits": ""
  },
  "portfolio_summary": {
    "statement_as_of": "",
    "total_invested": "",
    "total_current_value": "",
    "absolute_gain": ""
  },
  "holdings": [
    {
      "fund_name": "",
      "category": "",
      "amc": "",
      "folio_number": "",
      "invested_amount": "",
      "current_value": "",
      "units": "",
      "nav": "",
      "purchase_date": "",
      "plan": ""
    }
  ],
  "services": [],
  "transactions": [
    {
      "date": "",
      "description": "",
      "debit": "",
      "credit": "",
      "balance": ""
    }
  ],
  "key_points": [],
  "missing_fields": [],
  "confidence_notes": []
}
""".strip()

app = FastAPI(
    title="Groq Financial Document Parser API",
    version="1.0.0",
    description="Uploads PDFs, extracts and cleans text, then returns structured JSON from Groq.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_client: Optional[AsyncGroq] = None
_request_timestamps: Deque[float] = deque()
_token_timestamps: Deque[Tuple[float, int]] = deque()
_rate_lock = asyncio.Lock()


def get_groq_api_key() -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Add it to the environment or the project .env file."
        )
    return api_key


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=get_groq_api_key(), max_retries=0)
    return _client


def estimate_tokens(text: str) -> int:
    return max(1, math.ceil(len(text or "") / 4))


SYSTEM_PROMPT_TOKENS = estimate_tokens(SYSTEM_PROMPT)
MAX_INPUT_TOKENS = TPM_LIMIT - SYSTEM_PROMPT_TOKENS - MAX_COMPLETION_TOKENS - TPM_BUFFER
HARD_REJECT_INPUT_TOKENS = TPM_LIMIT - SYSTEM_PROMPT_TOKENS - 250


def truncate_text_intelligently(text: str, max_tokens: int) -> str:
    max_chars = max_tokens * 4
    if len(text) <= max_chars:
        return text

    paragraphs = [chunk.strip() for chunk in re.split(r"\n\s*\n", text) if chunk.strip()]
    selected_parts = []
    current_size = 0

    for paragraph in paragraphs:
        paragraph_size = len(paragraph) + 2
        if current_size + paragraph_size > max_chars:
            break
        selected_parts.append(paragraph)
        current_size += paragraph_size

    if selected_parts:
        return "\n\n".join(selected_parts)

    truncated = text[:max_chars]
    cutoff = max(truncated.rfind("\n"), truncated.rfind(". "), truncated.rfind(" "))
    if cutoff > int(max_chars * 0.7):
        truncated = truncated[:cutoff]

    return truncated.strip()


async def acquire_rate_slot(estimated_total_tokens: int) -> None:
    while True:
        async with _rate_lock:
            now = time.monotonic()

            while _request_timestamps and now - _request_timestamps[0] >= 60:
                _request_timestamps.popleft()

            while _token_timestamps and now - _token_timestamps[0][0] >= 60:
                _token_timestamps.popleft()

            current_tokens = sum(token_count for _, token_count in _token_timestamps)
            time_since_last_request = now - _request_timestamps[-1] if _request_timestamps else None

            spacing_wait = 0.0
            if time_since_last_request is not None and time_since_last_request < MIN_SECONDS_BETWEEN_CALLS:
                spacing_wait = MIN_SECONDS_BETWEEN_CALLS - time_since_last_request

            rpm_wait = 0.0
            if len(_request_timestamps) >= RPM_LIMIT:
                rpm_wait = 60 - (now - _request_timestamps[0])

            tpm_wait = 0.0
            if current_tokens + estimated_total_tokens > TPM_LIMIT and _token_timestamps:
                tpm_wait = 60 - (now - _token_timestamps[0][0])

            wait_for = max(spacing_wait, rpm_wait, tpm_wait, 0.0)
            if wait_for <= 0:
                request_time = time.monotonic()
                _request_timestamps.append(request_time)
                _token_timestamps.append((request_time, estimated_total_tokens))
                return

        await asyncio.sleep(min(wait_for + 0.05, 5.0))


@retry(
    reraise=True,
    stop=stop_after_attempt(5),
    wait=wait_random_exponential(multiplier=1, min=2, max=20),
    retry=retry_if_exception_type(RateLimitError),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
async def call_groq_for_json(cleaned_text: str) -> Dict[str, Any]:
    estimated_total_tokens = estimate_tokens(cleaned_text) + SYSTEM_PROMPT_TOKENS + MAX_COMPLETION_TOKENS
    await acquire_rate_slot(estimated_total_tokens)

    completion = await get_groq_client().chat.completions.create(
        model=MODEL_NAME,
        temperature=0,
        max_completion_tokens=MAX_COMPLETION_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Parse the following cleaned financial document text into the required detailed JSON object. "
                    "The text came from a PDF upload.\n\n"
                    f"CLEANED_TEXT:\n{cleaned_text}"
                ),
            },
        ],
    )

    content = completion.choices[0].message.content
    if not content:
        raise ValueError("Groq returned an empty response.")

    return json.loads(content)


async def process_uploaded_pdf(file: UploadFile) -> Dict[str, Any]:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if not filename.endswith(".pdf") and content_type != "application/pdf":
        raise HTTPException(status_code=400, detail=f"Only PDF files are supported: {file.filename}")

    file_bytes = await file.read()
    extracted_text, page_count, extraction_method = extract_text_from_pdf(file_bytes)
    cleaned_text = clean_extracted_text(extracted_text)

    if not cleaned_text:
        raise HTTPException(status_code=422, detail=f"The PDF did not produce usable cleaned text: {file.filename}")

    estimated_input_tokens = estimate_tokens(cleaned_text)
    if estimated_input_tokens >= HARD_REJECT_INPUT_TOKENS:
        raise HTTPException(
            status_code=429,
            detail={
                "message": f"Extracted text is too large for the configured TPM safety budget: {file.filename}",
                "estimated_tokens": estimated_input_tokens,
                "hard_limit_tokens": HARD_REJECT_INPUT_TOKENS,
                "pages": page_count,
                "suggestion": "Split the PDF into smaller sections before uploading.",
            },
        )

    if estimated_input_tokens > MAX_INPUT_TOKENS:
        truncated_text = truncate_text_intelligently(cleaned_text, MAX_INPUT_TOKENS)
        logger.warning(
            "Cleaned text truncated for file=%s from estimated_tokens=%s to estimated_tokens=%s.",
            file.filename,
            estimated_input_tokens,
            estimate_tokens(truncated_text),
        )
        cleaned_text = truncated_text

    logger.info(
        "Processing file=%s pages=%s extraction_method=%s estimated_tokens=%s",
        file.filename,
        page_count,
        extraction_method,
        estimate_tokens(cleaned_text),
    )
    analysis = await call_groq_for_json(cleaned_text)
    return {
        "filename": file.filename or "document.pdf",
        "pages": page_count,
        "extraction_method": extraction_method,
        "analysis": analysis,
    }


@app.get("/health")
async def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/parse-document")
async def parse_document(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        get_groq_api_key()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    try:
        result = await process_uploaded_pdf(file)
        return result["analysis"]
    except PDFExtractionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="Groq rate limit was reached after retries. Please retry shortly.") from error
    except JSONDecodeError as error:
        logger.exception("Groq returned invalid JSON.")
        raise HTTPException(status_code=502, detail="Groq returned invalid JSON that could not be parsed.") from error
    except ValueError as error:
        logger.exception("Groq returned an unusable response.")
        raise HTTPException(status_code=502, detail=str(error)) from error
    except APIStatusError as error:
        logger.exception("Groq API status error: %s", error)
        raise HTTPException(status_code=502, detail="Groq API returned a non-success status.") from error
    except APIConnectionError as error:
        logger.exception("Groq API connection error: %s", error)
        raise HTTPException(status_code=502, detail="Unable to reach Groq API.") from error
    except HTTPException:
        raise
    except Exception as error:  # pragma: no cover
        logger.exception("Unexpected parse-document failure: %s", error)
        raise HTTPException(status_code=500, detail="Unexpected document parsing failure.") from error
    finally:
        await file.close()


@app.post("/api/parse-documents")
async def parse_documents(files: List[UploadFile] = File(...)) -> Dict[str, Any]:
    try:
        get_groq_api_key()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    documents: List[Dict[str, Any]] = []
    errors: List[Dict[str, str]] = []

    for file in files:
        try:
            documents.append(await process_uploaded_pdf(file))
        except PDFExtractionError as error:
            errors.append({"filename": file.filename or "document.pdf", "message": str(error)})
        except RateLimitError:
            errors.append({"filename": file.filename or "document.pdf", "message": "Groq rate limit was reached after retries. Please retry shortly."})
        except JSONDecodeError:
            errors.append({"filename": file.filename or "document.pdf", "message": "Groq returned invalid JSON that could not be parsed."})
        except ValueError as error:
            errors.append({"filename": file.filename or "document.pdf", "message": str(error)})
        except APIStatusError:
            errors.append({"filename": file.filename or "document.pdf", "message": "Groq API returned a non-success status."})
        except APIConnectionError:
            errors.append({"filename": file.filename or "document.pdf", "message": "Unable to reach Groq API."})
        except HTTPException as error:
            errors.append({"filename": file.filename or "document.pdf", "message": str(error.detail)})
        except Exception as error:  # pragma: no cover
            logger.exception("Unexpected parse-documents failure: %s", error)
            errors.append({"filename": file.filename or "document.pdf", "message": "Unexpected document parsing failure."})
        finally:
            await file.close()

    if not documents and errors:
        raise HTTPException(status_code=502, detail=errors)

    return {"documents": documents, "errors": errors}



