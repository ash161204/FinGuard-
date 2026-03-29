import re


def clean_text(text: str) -> str:
    normalized = text.replace("\r", "\n")
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return "\n".join(line.strip() for line in normalized.splitlines()).strip()


def redact_pii(text: str) -> str:
    redacted = re.sub(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", "[PAN_REDACTED]", text)
    redacted = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "[AADHAAR_REDACTED]", redacted)
    redacted = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "[EMAIL_REDACTED]", redacted)
    redacted = re.sub(r"\b(?:\+91[- ]?)?[6-9]\d{9}\b", "[PHONE_REDACTED]", redacted)
    return redacted
