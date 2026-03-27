# PDF Text Extraction Backend

A minimal FastAPI service that accepts PDF uploads, extracts text with PyMuPDF, and returns JSON.

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health`
- `POST /extract`
- `POST /extract/batch`

## Example curl

```bash
curl -X POST "http://127.0.0.1:8000/extract" \
  -F "file=@sample.pdf"
```

```bash
curl -X POST "http://127.0.0.1:8000/extract/batch" \
  -F "files=@sample-1.pdf" \
  -F "files=@sample-2.pdf"
```