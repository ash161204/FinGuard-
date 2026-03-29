from typing import Any, Literal

import httpx

from app.core.config import get_settings

EngineMode = Literal["tax", "mf", "score"]


class EngineServiceError(RuntimeError):
    """Raised when the Node engine service fails."""


class EngineClient:
    def __init__(self, base_url: str | None = None, timeout: float = 10.0):
        settings = get_settings()
        self.base_url = base_url or settings.engine_service_url
        self.timeout = timeout

    async def run_engine(self, mode: EngineMode, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post("/run-engine", json={"mode": mode, "payload": payload})

        if response.status_code >= 400:
            raise EngineServiceError(response.text)

        body = response.json()
        return body["result"]
