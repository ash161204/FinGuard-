# FinGuard v1 Release Checklist

## **Pre-Deployment**
- [ ] **Environment Variables**: Ensure `GEMINI_API_KEY` is obtained from Google AI Studio.
- [ ] **Database Migrations**: Run `alembic upgrade head` locally against a test DB to ensure schema is stable.
- [ ] **Tests**: All suites (`pytest`, `vitest`, `jest`) must pass with 0 failures.
- [ ] **Build Check**: `npm run build` in `engine-service` and `frontend` should succeed without TS errors.

## **Render Configuration**
- [ ] **Persistent Disk**: Verify the `/data/uploads` mount path matches the `UPLOAD_PATH` env var.
- [ ] **Service Linking**: Ensure the backend's `ENGINE_SERVICE_URL` correctly points to the internal host of the engine service.
- [ ] **Secrets**: Manually add the `GEMINI_API_KEY` to the backend service's environment in Render.

## **Post-Deployment Validation**
- [ ] **Health Checks**: Verify both `/api/v1/health` (backend) and `/health` (engine) return `ok`.
- [ ] **End-to-End Flow**:
    - [ ] Upload a sample Form 16 PDF.
    - [ ] Poll job status until `completed`.
    - [ ] Review extraction and save corrections.
    - [ ] Generate a Tax Analysis report.
    - [ ] Refresh the Money Health Score.
- [ ] **Logs**: Check Render logs for any structured JSON errors or connection failures.