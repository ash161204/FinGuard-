import json

import httpx
import pytest

from app.services.engine_client import EngineClient, EngineServiceError


@pytest.mark.anyio
async def test_engine_client_returns_result_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/run-engine"
        assert json.loads(request.content) == {
            "mode": "score",
            "payload": {"monthlyIncome": 100000, "monthlyExpenses": 50000},
        }
        return httpx.Response(200, json={"mode": "score", "result": {"overallScore": 88}})

    transport = httpx.MockTransport(handler)

    class MockAsyncClient(httpx.AsyncClient):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, transport=transport, **kwargs)

    monkeypatch.setattr("app.services.engine_client.httpx.AsyncClient", MockAsyncClient)

    client = EngineClient(base_url="http://engine.test")
    result = await client.run_engine("score", {"monthlyIncome": 100000, "monthlyExpenses": 50000})

    assert result == {"overallScore": 88}


@pytest.mark.anyio
async def test_engine_client_raises_on_error(monkeypatch: pytest.MonkeyPatch) -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="boom")

    transport = httpx.MockTransport(handler)

    class MockAsyncClient(httpx.AsyncClient):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, transport=transport, **kwargs)

    monkeypatch.setattr("app.services.engine_client.httpx.AsyncClient", MockAsyncClient)

    client = EngineClient(base_url="http://engine.test")

    with pytest.raises(EngineServiceError):
        await client.run_engine("tax", {"documentResults": []})
