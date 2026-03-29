# ADR 0001: V1 architecture

## Status

Accepted on 2026-03-29.

## Context

FinGuard is currently a greenfield repository with an existing `insightEngine.js` rules engine. The v1 goal is to deliver a mobile-first financial app quickly without introducing unnecessary infrastructure risk.

## Decision

### Product scope

- Single demo user for v1.
- No authentication in v1.
- No bank statement analysis in v1 public APIs.

### Runtime architecture

- Frontend: Expo React Native app.
- Backend: FastAPI service.
- Engine: separate Node.js HTTP microservice wrapping `insightEngine.js`.
- Storage:
  - Postgres for application state.
  - local disk for uploaded documents in v1.
- Async processing: FastAPI `BackgroundTasks` for v1 jobs.

### Document processing

- Form 16 uses a tiered extraction strategy:
  - Level 1 core fields are mandatory.
  - Level 2 extended fields are optional.
  - Level 3 advanced fields are optional.
- CAMS extraction is strict but supports manual review and correction.
- Missing values are `null`, never guessed.
- Users may manually edit extracted values before analysis.

### Model usage

- Gemini 3.1 Flash Lite is used only for structuring and explanation.
- Deterministic services and the rules engine are the source of truth.

### Deployment target

- Render for backend and engine-service deployment.

## Consequences

### Positive

- Keeps v1 simple and fast to ship.
- Preserves the existing JavaScript rules engine.
- Avoids Celery and Redis before they are justified.
- Supports incomplete documents with partial analysis.

### Negative

- Local disk uploads are not horizontally scalable.
- Separate backend and engine services introduce cross-service contracts early.
- Demo-user mode means auth and multitenancy will need a later migration.

## Follow-up work

- Stabilize engine contracts in Sprint 2.
- Add database migrations and repositories in Sprint 2.
- Add extraction, review, and normalization pipeline in Sprints 3 and 4.
