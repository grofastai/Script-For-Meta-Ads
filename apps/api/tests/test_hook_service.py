from unittest.mock import MagicMock, patch
import pytest
from app.services.hook_service import get_top_hooks


@pytest.mark.asyncio
async def test_get_top_hooks_returns_hooks():
    mock_response = MagicMock()
    mock_response.data = [
        {
            "text": "Dharmapuri la neraya per paakum...",
            "hook_type": "local",
            "performance_score": 0.9,
            "saturation_score": 0.1,
        }
    ]
    mock_supabase = MagicMock()
    (
        mock_supabase.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .gte.return_value
        .order.return_value
        .limit.return_value
        .execute.return_value
    ) = mock_response

    with patch("app.services.hook_service.get_supabase", return_value=mock_supabase):
        hooks = await get_top_hooks("optical", "dharmapuri")

    assert len(hooks) == 1
    assert hooks[0]["text"] == "Dharmapuri la neraya per paakum..."


@pytest.mark.asyncio
async def test_get_top_hooks_returns_empty_when_none():
    mock_response = MagicMock()
    mock_response.data = []
    mock_supabase = MagicMock()
    (
        mock_supabase.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .gte.return_value
        .order.return_value
        .limit.return_value
        .execute.return_value
    ) = mock_response

    with patch("app.services.hook_service.get_supabase", return_value=mock_supabase):
        hooks = await get_top_hooks("optical", "dharmapuri")

    assert hooks == []
