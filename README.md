# FinGuard v1

FinGuard is a mobile-first financial intelligence platform that helps users understand their money health, optimize taxes, and plan for financial independence (FIRE). It uses LLM-powered extraction to parse Form 16 and CAMS PDFs and runs them through a deterministic financial rules engine.

## **Architecture Overview**

The platform consists of three primary services:

1.  **Frontend (React Native/Expo)**: A cross-platform mobile app for document uploads, extraction review, and financial reporting.
2.  **Backend (FastAPI)**: A Python service managing the database, background extraction jobs (Gemini/OCR), and analysis orchestration.
3.  **Engine Service (Node.js)**: A stable microservice wrapper around the core `insightEngine.js` financial rules logic.

### **The Extraction Pipeline**

- **Ingestion**: PDF uploads are stored locally and a background job is enqueued.
- **Extraction**:
    - **Raw Text**: Attempted using `pypdf`.
    - **OCR Fallback**: If text is sparse or missing, `Tesseract` is used to OCR the document.
- **Structuring**: Cleaned text and regex hints are sent to **Google Gemini** with strict function-calling to produce a JSON payload.
- **Review**: Users can review and manually correct any fields that the extraction missed.
- **Normalization**: Reviewed data is transformed into a canonical JSON format suitable for the financial engine.

## **Local Setup**

### **Prerequisites**
- Node.js v18+
- Python 3.11+
- Tesseract OCR (optional, for OCR fallback)
- Google Gemini API Key

### **1. Environment Configuration**
Copy `.env.example` to `.env` in the root and configure the following:
- `GEMINI_API_KEY`: Your Google AI Studio key.
- `ENGINE_SERVICE_URL`: Typically `http://localhost:3000`.
- `DATABASE_URL`: A PostgreSQL or local SQLite URL.

### **2. Service Installation**

```bash
# Install root and workspace dependencies
npm install
npm --workspace frontend install
npm --workspace engine-service install

# Install backend dependencies
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

### **3. Running the Services**

```bash
# Start the Engine Service (Port 3000)
npm run dev:engine

# Start the Backend Service (Port 8000)
npm run dev:backend

# Start the Frontend (Expo)
npm run dev:frontend
```

## **API Documentation**

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **Redoc**: `http://localhost:8000/redoc`

### **Key Endpoints**
- `POST /api/v1/upload/form16`: Upload a Form 16 PDF.
- `GET /api/v1/job/{id}`: Poll for extraction status.
- `POST /api/v1/analyze/tax`: Generate a tax report from reviewed data.
- `POST /api/v1/score`: Calculate the Money Health Score.

## **Observability & Testing**

- **Logging**: The backend uses structured JSON logging with `X-Request-ID` headers for request tracing.
- **Testing**:
    - **Backend**: `pytest` in the `backend/` folder.
    - **Engine**: `npm test` in the `engine-service/` folder.
    - **Frontend**: `npm test` in the `frontend/` folder.

## **V1 Limitations**
- **Single User**: Designed for a demo user scenario without multi-tenant auth.
- **Local Storage**: Uploaded files are stored on the local disk (or persistent volumes in production).
- **Background Tasks**: Uses FastAPI `BackgroundTasks` instead of a separate worker like Celery for simplicity in v1.
- **PDF Only**: Supports only Form 16 (Tax) and CAMS (Mutual Funds) PDF formats.
- May not accurately detect the fields from the Form 16 and CAMS PDF.