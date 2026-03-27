from app.schemas import DocumentType


def classify_document(text: str) -> DocumentType:
    """Classify a document using simple keyword detection."""

    normalized_text = (text or "").upper()

    if "FORM NO. 16" in normalized_text or "FORM 16" in normalized_text:
        return DocumentType.form16

    if "ACCOUNT STATEMENT" in normalized_text or "STATEMENT OF ACCOUNT" in normalized_text:
        return DocumentType.bank_statement

    return DocumentType.ca_camps