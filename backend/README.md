# Backend

This backend is the PDF ingestion and Groq parsing service for FinGuard AI.

For the full project walkthrough, architecture, and folder-level explanation, see the root README:

- [`../README.md`](../README.md)

## What this backend does

1. Accepts one or more uploaded PDF files
2. Extracts text with `pdfplumber`
3. Falls back to `PyMuPDF` if needed
4. Cleans the extracted text
5. Sends the cleaned text to Groq
6. Returns structured JSON to the frontend

## Active endpoints

- `GET /health`
- `POST /api/parse-document`
- `POST /api/parse-documents`

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Quick test

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/parse-document" -F "file=@C:\path\to\document.pdf"
```
