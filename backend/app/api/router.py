from fastapi import APIRouter

from app.api.routes.actions import router as actions_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.uploads import router as uploads_router

api_router = APIRouter()
api_router.include_router(actions_router, tags=["actions"])
api_router.include_router(analysis_router, tags=["analysis"])
api_router.include_router(documents_router, tags=["documents"])
api_router.include_router(health_router, tags=["health"])
api_router.include_router(jobs_router, tags=["jobs"])
api_router.include_router(uploads_router, tags=["uploads"])
