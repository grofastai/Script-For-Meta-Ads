import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import get_current_user
from app.models.script import ScriptResponse, HookVariant

client = TestClient(app)

MOCK_HOOK = HookVariant(text="Test hook", type="curiosity", freshness_score=1.0)

MOCK_RESPONSE = ScriptResponse(
    hooks=[MOCK_HOOK],
    selected_hook=MOCK_HOOK,
    script="Test script body",
    cta="Call now",
    caption="Test caption",
    hashtags=["#test"],
    posting_time="Tuesday 7pm",
    ad_copy="Test ad copy",
    video_structure="Founder on camera",
    shot_list=["Shot 1: Intro"],
)

VALID_PAYLOAD = {
    "niche": "optical",
    "city": "dharmapuri",
    "target_audience": "Adults 25-45",
    "offer": "Free eye checkup",
    "goal": "leads",
    "language": "tanglish",
}


def test_generate_script_requires_auth():
    response = client.post("/generate/script", json=VALID_PAYLOAD)
    assert response.status_code == 403


def test_generate_script_returns_200_with_valid_input():
    async def mock_user():
        return {"id": "user-123", "email": "test@grofast.in"}

    app.dependency_overrides[get_current_user] = mock_user

    with patch("app.routers.generate.generate_script", AsyncMock(return_value=MOCK_RESPONSE)):
        response = client.post("/generate/script", json=VALID_PAYLOAD)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["cta"] == "Call now"
    assert len(data["hooks"]) == 1
    assert data["selected_hook"]["text"] == "Test hook"


def test_generate_script_returns_422_with_missing_fields():
    async def mock_user():
        return {"id": "user-123", "email": "test@grofast.in"}

    app.dependency_overrides[get_current_user] = mock_user
    response = client.post("/generate/script", json={"niche": "optical"})
    app.dependency_overrides.clear()

    assert response.status_code == 422
