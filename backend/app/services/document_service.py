from app.schemas import DocumentType, ExtractionResponse
from app.services.classifier import classify_document
from app.services.extractor import extract_text_from_pdf
from app.services.parsers import PARSER_MAP


def process_document(file_bytes: bytes, filename: str, requested_doc_type: DocumentType | None = None) -> ExtractionResponse:
    """Run extraction, classification, and parsing for a single uploaded PDF."""

    text, pages = extract_text_from_pdf(file_bytes)
    document_type = requested_doc_type or classify_document(text)
    parser = PARSER_MAP[document_type]
    parsed_data = parser(text)

    return ExtractionResponse(
        filename=filename,
        document_type=document_type,
        pages=pages,
        data=parsed_data,
    )