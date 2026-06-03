from datetime import datetime, timezone
from ..core.database import get_supabase


async def get_top_hooks(niche: str, city: str, limit: int = 5) -> list[dict]:
    supabase = get_supabase()
    response = (
        supabase.table("hooks")
        .select("text, hook_type, performance_score, saturation_score")
        .eq("niche", niche)
        .eq("city", city)
        .gte("performance_score", 0.7)
        .lt("saturation_score", 1.0)
        .order("performance_score", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


async def increment_hook_use(hook_text: str, niche: str, city: str, org_id: str) -> None:
    """Increment use_count for a hook and recalculate saturation_score.

    saturation_score = min(use_count / 10, 1.0) — score of 1.0 means hook is oversaturated.
    """
    supabase = get_supabase()
    match = (
        supabase.table("hooks")
        .select("id, use_count")
        .eq("text", hook_text)
        .eq("niche", niche)
        .eq("city", city)
        .eq("org_id", org_id)
        .maybe_single()
        .execute()
    )
    if not match.data:
        return
    new_count = (match.data.get("use_count") or 0) + 1
    saturation = min(new_count / 10.0, 1.0)
    supabase.table("hooks").update({
        "use_count": new_count,
        "saturation_score": saturation,
        "last_used_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", match.data["id"]).execute()
