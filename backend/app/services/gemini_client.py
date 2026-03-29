import json
from typing import Any

import httpx

from app.core.config import get_settings

SYSTEM_PROMPT = "You are a financial document parser. Extract ONLY values present. DO NOT guess."

FORM16_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "salary": {"type": ["number", "null"]},
        "hra_received": {"type": ["number", "null"]},
        "rent_paid": {"type": ["number", "null"]},
        "tax_deducted": {"type": ["number", "null"]},
        "deductions": {
            "type": "object",
            "properties": {
                "80C": {"type": ["number", "null"]},
                "80D": {"type": ["number", "null"]},
                "80CCD1B": {"type": ["number", "null"]},
            },
        },
        "lta": {"type": ["number", "null"]},
        "bonus": {"type": ["number", "null"]},
        "other_allowances": {"type": ["number", "null"]},
        "professional_tax": {"type": ["number", "null"]},
        "previous_employer_income": {"type": ["number", "null"]},
        "other_income": {"type": ["number", "null"]},
        "losses": {"type": ["number", "null"]},
    },
}

CAMS_FUND_NORMALIZATION_SCHEMA: dict[str, Any] = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "original_name": {"type": "string"},
            "fund_name": {"type": ["string", "null"]},
            "category": {"type": ["string", "null"]},
            "plan": {"type": ["string", "null"]},
            "option": {"type": ["string", "null"]},
        },
        "required": ["original_name", "fund_name", "category"],
    },
}

class GeminiConfigurationError(RuntimeError):
    """Raised when Gemini is not configured."""


class GeminiExtractionError(RuntimeError):
    """Raised when Gemini extraction fails."""


class GeminiClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.model = model or settings.gemini_model
        self.base_url = base_url or settings.gemini_base_url
        self.transport = transport

    async def structure_document(
        self,
        *,
        document_type: str,
        cleaned_text: str,
        regex_candidates: dict[str, Any],
    ) -> dict[str, Any]:
        if not self.api_key:
            raise GeminiConfigurationError("Gemini API key is not configured.")

        # This method is now form16 only, but keeping signature for callers
        schema = FORM16_RESPONSE_SCHEMA
        prompt = (
            "Extract data into this JSON schema:\n"
            f"{json.dumps(schema)}\n"
            "Return null for missing fields.\n"
            "Use these regex hints if useful, but do not invent values:\n"
            f"{json.dumps(regex_candidates)}\n"
            "Document text:\n"
            f"{cleaned_text}"
        )
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
            },
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }
        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=20.0,
            transport=self.transport,
        ) as client:
            response = await client.post(
                f"/v1beta/models/{self.model}:generateContent",
                headers=headers,
                json=payload,
            )

        if response.status_code >= 400:
            raise GeminiExtractionError(response.text)

        body = response.json()
        try:
            raw_text = body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise GeminiExtractionError("Gemini response did not contain JSON text.") from exc

        try:
            return json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise GeminiExtractionError("Gemini returned invalid JSON.") from exc

    async def normalize_cams_funds(self, fund_names: list[str]) -> list[dict[str, Any]]:
        if not self.api_key:
            raise GeminiConfigurationError("Gemini API key is not configured.")
            
        if not fund_names:
            return []

        prompt = (
            "Normalize the following mutual fund names and determine their asset category (e.g., Equity, Debt, Hybrid).\n"
            "Extract 'plan' (Direct/Regular) and 'option' (Growth/Dividend) if present.\n"
            "Return an array of objects mapping the 'original_name' to its cleaned fields.\n\n"
            "Fund names to normalize:\n" +
            "\n".join(f"- {name}" for name in fund_names)
        )
        
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
                "responseJsonSchema": CAMS_FUND_NORMALIZATION_SCHEMA,
            },
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }
        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            transport=self.transport,
        ) as client:
            response = await client.post(
                f"/v1beta/models/{self.model}:generateContent",
                headers=headers,
                json=payload,
            )

        if response.status_code >= 400:
            raise GeminiExtractionError(response.text)

        body = response.json()
        try:
            raw_text = body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise GeminiExtractionError("Gemini response did not contain JSON text.") from exc

        try:
            return json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise GeminiExtractionError("Gemini returned invalid JSON.") from exc
