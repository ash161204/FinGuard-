from typing import List

from pydantic import BaseModel


class ExtractionResponse(BaseModel):
    """Response model for extracted PDF text."""

    filename: str
    pages: int
    text: str


class BatchExtractionResponse(BaseModel):
    """Response model for extracting text from multiple PDFs."""

    documents: List[ExtractionResponse]