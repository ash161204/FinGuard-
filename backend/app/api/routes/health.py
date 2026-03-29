from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "backend",
        "environment": settings.app_env,
        "timestamp": datetime.now(UTC).isoformat(),
    }
