from ..core.database import get_supabase


async def get_top_hooks(niche: str, city: str, limit: int = 5) -> list[dict]:
    supabase = get_supabase()
    response = (
        supabase.table("hooks")
        .select("text, hook_type, performance_score, saturation_score")
        .eq("niche", niche)
        .eq("city", city)
        .gte("performance_score", 0.0)
        .order("performance_score", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []
