import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_service import generate


@pytest.mark.asyncio
async def test_generate_returns_parsed_json():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": json.dumps({"hooks": []})}}]
    }
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)

    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ai_service.httpx.AsyncClient", return_value=mock_async_client):
        result = await generate("test prompt", "hooks")

    assert result == {"hooks": []}


@pytest.mark.asyncio
async def test_generate_uses_gpt4o_for_hooks():
    captured = {}

    async def mock_post(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": '{"hooks": []}'}}]
        }
        mock_resp.raise_for_status = MagicMock()
        return mock_resp

    mock_client_instance = AsyncMock()
    mock_client_instance.post = mock_post

    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ai_service.httpx.AsyncClient", return_value=mock_async_client):
        await generate("test prompt", "hooks")

    assert captured.get("model") == "gpt-4o"


@pytest.mark.asyncio
async def test_generate_uses_claude_for_lead_script():
    captured = {}

    async def mock_post(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": '{"script": ""}'}}]
        }
        mock_resp.raise_for_status = MagicMock()
        return mock_resp

    mock_client_instance = AsyncMock()
    mock_client_instance.post = mock_post

    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ai_service.httpx.AsyncClient", return_value=mock_async_client):
        await generate("test prompt", "lead-script")

    assert captured.get("model") == "claude-sonnet-4-5"
