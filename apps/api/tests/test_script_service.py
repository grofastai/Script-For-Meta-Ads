import pytest
from unittest.mock import AsyncMock, patch
from app.services.script_service import generate_script
from app.models.script import ScriptRequest

SAMPLE_REQUEST = ScriptRequest(
    niche="optical",
    city="dharmapuri",
    target_audience="Adults 25-45",
    offer="Free eye checkup + 20% off frames",
    goal="leads",
    language="tanglish",
    business_name="Vision Care Optical",
)

MOCK_HOOKS_RESPONSE = {
    "hooks": [
        {"text": "Dharmapuri la innum neraya per glasses illama suffer pannitu irukanga!", "type": "local"},
        {"text": "Kanna problem iruka? Free checkup pannrom!", "type": "curiosity"},
        {"text": "First 50 customers matum — free eye checkup!", "type": "urgency"},
    ]
}

MOCK_SCRIPT_RESPONSE = {
    "script": "[0-3s] Hook text here\n[3-15s] Problem...",
    "cta": "DM us or call 9876543210",
    "caption": "Test caption text",
    "hashtags": ["#DharmapuriOptical", "#FreeEyeCheckup"],
    "posting_time": "Tuesday 7pm",
    "ad_copy": "Test ad copy",
    "video_structure": "Founder on camera introduction",
    "shot_list": ["Shot 1: Founder intro", "Shot 2: Customer testimonial"],
}

FAKE_PROMPT = "{{city}} {{offer}} {{audience}} {{few_shot_examples}} {{city_psychology}}"


@pytest.mark.asyncio
async def test_generate_script_returns_full_response():
    with (
        patch("app.services.script_service.get_top_hooks", AsyncMock(return_value=[])),
        patch(
            "app.services.script_service.generate",
            AsyncMock(side_effect=[MOCK_HOOKS_RESPONSE, MOCK_SCRIPT_RESPONSE]),
        ),
        patch("pathlib.Path.read_text", return_value=FAKE_PROMPT),
        patch("pathlib.Path.exists", return_value=True),
    ):
        result = await generate_script(SAMPLE_REQUEST)

    assert len(result.hooks) == 3
    assert result.script == MOCK_SCRIPT_RESPONSE["script"]
    assert result.cta == MOCK_SCRIPT_RESPONSE["cta"]
    assert result.hashtags == MOCK_SCRIPT_RESPONSE["hashtags"]
    assert len(result.shot_list) == 2


@pytest.mark.asyncio
async def test_generate_script_sets_freshness_1_when_no_top_hooks():
    with (
        patch("app.services.script_service.get_top_hooks", AsyncMock(return_value=[])),
        patch(
            "app.services.script_service.generate",
            AsyncMock(side_effect=[MOCK_HOOKS_RESPONSE, MOCK_SCRIPT_RESPONSE]),
        ),
        patch("pathlib.Path.read_text", return_value=FAKE_PROMPT),
        patch("pathlib.Path.exists", return_value=True),
    ):
        result = await generate_script(SAMPLE_REQUEST)

    for hook in result.hooks:
        assert hook.freshness_score == 1.0


@pytest.mark.asyncio
async def test_generate_script_selects_hook_with_highest_freshness():
    with (
        patch("app.services.script_service.get_top_hooks", AsyncMock(return_value=[])),
        patch(
            "app.services.script_service.generate",
            AsyncMock(side_effect=[MOCK_HOOKS_RESPONSE, MOCK_SCRIPT_RESPONSE]),
        ),
        patch("pathlib.Path.read_text", return_value=FAKE_PROMPT),
        patch("pathlib.Path.exists", return_value=True),
    ):
        result = await generate_script(SAMPLE_REQUEST)

    assert result.selected_hook.freshness_score == 1.0
