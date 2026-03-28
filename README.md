# FinGuard AI

FinGuard AI is a hybrid Expo + FastAPI financial hackathon project.
It combines a mobile-first React Native frontend with a Python backend that accepts uploaded PDFs, extracts and cleans their text, sends that text to Groq for structured parsing, and then turns the returned JSON into user-facing financial insights.

The app currently behaves like a guided 3-step flow plus an AI coach:

1. Page 1 (`/`) captures onboarding inputs such as income, monthly needs, primary financial goal, and risk profile.
2. Page 2 (`/swipe`) is now a document upload and analysis screen. Users upload one or more PDFs, and the app sends them to the backend for extraction and Groq analysis.
3. Page 3 (`/dashboard`) converts the parsed JSON into two insight systems:
   - Tax Wizard
   - MF Portfolio X-Ray
4. `/coach` is a separate AI chat experience powered by Gemini and the app's stored state.

---

## 1. High-Level Architecture

The repository is split into two main parts:

- Frontend: Expo Router + React Native
- Backend: FastAPI + PDF extraction + Groq parsing

At runtime, the flow is:

```text
User picks PDFs in Expo app
    -> frontend builds multipart/form-data request
    -> backend receives PDF files
    -> backend extracts text using pdfplumber
    -> backend falls back to PyMuPDF if needed
    -> backend cleans the extracted text
    -> backend sends cleaned text to Groq
    -> Groq returns structured JSON
    -> frontend stores structured JSON in AppContext
    -> dashboard runs Tax Wizard + MF X-Ray logic on that JSON
    -> user sees financial insights
```

---

## 2. Repository Structure

```text
Hackathon/
|-- app/
|   |-- _layout.js
|   |-- index.js
|   |-- swipe.js
|   |-- dashboard.js
|   `-- coach.js
|
|-- backend/
|   |-- app/
|   |   |-- __init__.py
|   |   |-- main.py
|   |   |-- schemas.py
|   |   `-- services/
|   |       |-- __init__.py
|   |       |-- extractor.py
|   |       |-- classifier.py
|   |       |-- document_service.py
|   |       `-- parsers.py
|   |-- requirements.txt
|   `-- README.md
|
|-- constants/
|   `-- transactions.js
|
|-- context/
|   |-- AppContext.js
|   `-- FinanceContext.js
|
|-- utils/
|   |-- documentApi.js
|   |-- finance.js
|   `-- insightEngine.js
|
|-- .env
|-- .env.example
|-- .gitignore
|-- app.json
|-- babel.config.js
|-- global.css
|-- metro.config.js
|-- package.json
|-- package-lock.json
|-- tailwind.config.js
|-- README.md
|
|-- .expo/                 (generated local Expo metadata)
|-- dist/                  (generated build output if produced)
|-- node_modules/          (generated frontend dependencies)
`-- backend/.venv/         (generated backend virtual environment)
```

Important note:
- `.expo/`, `dist/`, `node_modules/`, and `backend/.venv/` are generated directories and are not part of the core source design.
- `backend/app/services/classifier.py`, `document_service.py`, and `parsers.py` are earlier/legacy prototype files. The current live backend request path is driven mainly by `backend/app/main.py` and `backend/app/services/extractor.py`.

---

## 3. Frontend Structure

### `app/_layout.js`
This is the Expo Router root layout.
It does three important things:

- imports `global.css` so NativeWind/Tailwind classes work where used
- wraps the app in `AppProvider`
- mounts the top-level `Stack` navigator

This file is effectively the frontend composition root.

### `app/index.js`
This is Page 1, the onboarding screen.
It is responsible for:

- collecting user income
- collecting the monthly-needs slider amount
- collecting the primary financial goal
- collecting the user's risk vibe
- saving all onboarding values into `AppContext`
- routing the user to `/swipe`

The slider uses `@react-native-community/slider` rather than a custom hand-built slider, which makes the interaction much smoother and more accurate on mobile.

### `app/swipe.js`
Despite the route name, this is no longer a card-swipe page.
It is now the document-upload screen.

Responsibilities:

- allows selecting multiple PDFs with `expo-document-picker`
- shows the backend base URL currently being used
- uploads files to the backend using `utils/documentApi.js`
- stores successful analysis results into `AppContext`
- shows the returned JSON in the UI
- routes to `/dashboard` when the user wants to view insights

This screen is the bridge between document ingestion and insight generation.

### `app/dashboard.js`
This is Page 3, the insight page.
It is entirely driven by the JSON stored in context from the upload page.

Responsibilities:

- reads `documentResults` and `riskVibe` from `AppContext`
- runs `buildTaxWizardReport(...)`
- runs `buildMfXRayReport(...)`
- renders a Tax Wizard section
- renders an MF Portfolio X-Ray section
- provides a CTA to continue to `/coach`

This page does not call the backend directly.
Instead, it works as a pure interpretation layer over already-analyzed JSON.

### `app/coach.js`
This is the conversational AI coach.
It is separate from the Groq document parser.

Responsibilities:

- builds a chat-oriented prompt using the current app state
- uses `EXPO_PUBLIC_GEMINI_API_KEY`
- calls Gemini directly from the frontend
- supports a `Savage Mode` tone switch

This means the project currently uses two AI systems:

- Groq in the backend for document parsing
- Gemini in the frontend for conversational coaching

---

## 4. Shared Frontend State

### `context/AppContext.js`
This file is the central frontend state container.
It exposes the app's shared data and helper actions.

Current state includes:

- `income`
- `needsSliderAmount`
- `primaryGoal`
- `riskVibe`
- `swipedTotals`
- `documentResults`
- `topLeak`
- `totalSwipedAmount`

Even though the app has moved away from the original swipe-categorizer concept, some earlier state fields such as `swipedTotals` and `topLeak` still exist because they are also used by the AI coach and help preserve compatibility with earlier app logic.

Key actions provided by context:

- `setIncome`
- `setNeedsSliderAmount`
- `setPrimaryGoal`
- `setRiskVibe`
- `saveOnboarding`
- `resetSwipedTotals`
- `addSwipeToCategory`
- `removeSwipeFromCategory`
- `setDocumentResults`
- `clearDocumentResults`

### `context/FinanceContext.js`
This is currently a compatibility shim. It exists so older imports do not break.

---

## 5. Frontend Utility Layer

### `utils/documentApi.js`
This file contains the frontend/backend networking logic for PDF analysis.

Responsibilities:

- determines the backend base URL
- respects `EXPO_PUBLIC_API_BASE_URL` when provided
- ignores placeholder URLs like `YOUR_LAPTOP_IP`
- falls back to Expo host detection where possible
- uploads selected PDFs as multipart/form-data
- parses backend JSON responses
- turns backend failures into readable frontend error messages

The main exported function is:

- `uploadDocuments({ assets })`

This is the primary data-ingestion client for the app.

### `utils/finance.js`
Contains formatting and scoring helpers used in the app UI.

### `utils/insightEngine.js`
This is one of the most important files in the project.
It contains the logic that turns parsed document JSON into product insights.

It currently powers two major analysis systems:

- Tax Wizard
- MF Portfolio X-Ray

This file was built by porting logic from external reference tools into repo-native JavaScript.

Important exports include:

- `unwrapAnalysis(document)`
- `buildTaxWizardReport(documentResults)`
- `buildMfXRayReport(documentResults, options)`

#### Tax Wizard logic inside `utils/insightEngine.js`
This section:

- searches uploaded JSON recursively for tax-relevant fields
- estimates old vs new regime tax
- finds potential savings
- derives missed deductions
- suggests investment actions
- highlights assumptions used in the calculation

#### MF Portfolio X-Ray logic inside `utils/insightEngine.js`
This section:

- searches uploaded JSON for holding-like arrays
- reconstructs fund holdings
- computes portfolio-level return metrics such as XIRR
- estimates overlap between equity-style fund categories
- computes TER drag
- compares inferred performance to benchmark assumptions
- generates a rebalancing-style action plan

Important limitation:
- MF X-Ray works best when the backend returns a `holdings` array from the Groq parsing stage.
- If the uploaded mutual-fund statement only returns summary text or transaction rows, TOOL 2 has much less to work with.

---

## 6. Backend Structure

### `backend/app/main.py`
This is the live backend entrypoint.
It is the single most important backend file.

Responsibilities:

- creates the FastAPI app
- loads environment variables from `.env`
- configures CORS middleware
- initializes the Groq client lazily
- estimates token usage for rate safety
- throttles requests to respect model limits
- retries Groq requests with `tenacity`
- validates uploaded PDFs
- extracts text from PDFs
- cleans text before LLM submission
- sends cleaned text to Groq
- returns the final structured JSON payloads

Current public endpoints:

- `GET /health`
- `POST /api/parse-document`
- `POST /api/parse-documents`

`/api/parse-document`:
- accepts one uploaded PDF
- extracts, cleans, parses, and returns a single analysis object

`/api/parse-documents`:
- accepts multiple PDFs in one request
- returns a batch payload with:
  - `documents`
  - `errors`

### `backend/app/services/extractor.py`
This is the active PDF text extraction layer.

Responsibilities:

- tries `pdfplumber` first
- falls back to `PyMuPDF` (`fitz`) if needed
- combines page text cleanly
- normalizes whitespace and broken lines
- raises `PDFExtractionError` for invalid extraction cases

This file is the backend's PDF ingestion core.

### `backend/app/schemas.py`
Contains Pydantic models.
These models are currently minimal and are not the main driver of the live parse flow.
They are more representative of an earlier extraction-focused response design.

### `backend/app/services/classifier.py`
Legacy helper from an earlier parsing design.
Not part of the main active request pipeline today.

### `backend/app/services/document_service.py`
Legacy orchestration helper from an earlier parsing design.
Not part of the main active request pipeline today.

### `backend/app/services/parsers.py`
Legacy parser module from an earlier rule-based approach.
The current backend relies primarily on the Groq structured response instead.

---

## 7. AI / Model Responsibilities

### Groq backend model
The backend uses:

- model: `llama-3.3-70b-versatile`

Groq is responsible for:

- reading cleaned extracted PDF text
- inferring document type
- returning structured JSON
- extracting tax, banking, and mutual-fund fields
- returning holdings for mutual-fund statements where possible

### Gemini frontend model
The AI coach uses Google's Gemini endpoint directly from the app.
This is independent from the backend parser and is focused on conversational guidance rather than extraction.

---

## 8. Environment Variables

### Root `.env`
The root `.env` is used across the project.
Current important variables are:

- `GROQ_API_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GEMINI_API_KEY` (if configured for the coach)

### `.env.example`
This file shows the expected variable names without real secrets.

Important security note:
- `.env` is intentionally ignored by Git
- `.env.example` is safe to commit

---

## 9. Running the Project Locally

### Frontend

```powershell
npm install
npx expo start -c
```

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Full local workflow

1. Start the backend first.
2. Confirm `http://127.0.0.1:8000/health` works.
3. Start Expo.
4. Upload PDFs on page 2.
5. Wait for parsed JSON.
6. Open page 3 for Tax Wizard + MF X-Ray insights.

---

## 10. API Contract Summary

### `GET /health`
Simple readiness check.

Example response:

```json
{ "status": "ok" }
```

### `POST /api/parse-document`
Accepts one PDF file as multipart upload.
Returns a single structured JSON analysis.

### `POST /api/parse-documents`
Accepts multiple PDF files as multipart upload.
Returns:

```json
{
  "documents": [
    {
      "filename": "sample.pdf",
      "pages": 3,
      "extraction_method": "pdfplumber",
      "analysis": {
        "document_type": "mutual_fund_statement"
      }
    }
  ],
  "errors": []
}
```

---

## 11. File-by-File Notes Worth Knowing

### `constants/transactions.js`
Legacy seed data from the earlier swipe-categorization prototype.
Not central to the current PDF-first product flow.

### `global.css`
Global NativeWind/Tailwind bridge file.

### `babel.config.js`
Babel configuration for Expo + NativeWind.

### `metro.config.js`
Metro bundler configuration.

### `tailwind.config.js`
Tailwind / NativeWind configuration.

### `app.json`
Expo app metadata including app name, slug, and platform identifiers.

### `package.json`
Frontend dependency manifest.
Notable packages include:

- `expo-router`
- `expo-document-picker`
- `expo-linear-gradient`
- `expo-haptics`
- `@react-native-community/slider`
- `nativewind`
- `react-native-deck-swiper` (kept from earlier prototype work)

### `backend/requirements.txt`
Backend dependency manifest.
Notable packages include:

- `fastapi`
- `uvicorn`
- `pdfplumber`
- `PyMuPDF`
- `groq`
- `tenacity`
- `python-dotenv`

---

## 12. Known Project Evolution / Legacy Artifacts

This codebase has evolved through multiple prototypes:

- originally a swipe-based expense categorization MVP
- later shifted to document upload + AI parsing
- then expanded into Tax Wizard and MF Portfolio X-Ray insights
- finally integrated a separate AI coaching screen

Because of that evolution, a few files and state fields still reflect older stages.
That is normal for this repo right now.
The important thing is that the active user journey is:

- onboarding
- upload PDFs
- parse with backend + Groq
- compute insights
- optionally chat with the AI coach

---

## 13. Known Limitations

1. Scanned image-only PDFs may still need OCR support for best results. The current extractor is text-PDF-first.
2. MF X-Ray depends heavily on whether Groq returns usable holdings rows.
3. Some backend service files remain from earlier architecture iterations and are not the current source of truth.
4. The coach and the parser use different AI providers today, which is fine for a hackathon but worth standardizing later.

---

## 14. Recommended Next Cleanup Steps

If this project continues beyond the hackathon, the most useful cleanup tasks would be:

1. Remove or archive legacy backend service files that are no longer in the live path.
2. Strengthen the mutual-fund extraction schema even further for CAMS/KFintech statements.
3. Add OCR for scanned PDFs.
4. Consolidate AI provider strategy if a single-provider architecture is preferred.
5. Add tests around extraction, parsing, and report generation.

---

## 15. Source of Truth Summary

If you only want to know where the current product logic really lives, start here:

- frontend entry/layout: `app/_layout.js`
- onboarding: `app/index.js`
- upload flow: `app/swipe.js`
- insights page: `app/dashboard.js`
- coach: `app/coach.js`
- app state: `context/AppContext.js`
- upload API client: `utils/documentApi.js`
- insight logic: `utils/insightEngine.js`
- backend API: `backend/app/main.py`
- PDF extraction: `backend/app/services/extractor.py`

Those files describe the current application more accurately than any earlier prototype remnants.
