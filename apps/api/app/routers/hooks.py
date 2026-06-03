from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from ..models.hook import HookItem, HookCreate
from ..core.auth import get_current_user
from ..core.database import get_supabase

router = APIRouter(prefix="/hooks", tags=["hooks"])


@router.get("", response_model=list[HookItem])
async def list_hooks(
    niche: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    hook_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
) -> list[HookItem]:
    org_id = user.get("org_id")
    if not org_id:
        return []
    try:
        supabase = get_supabase()
        query = (
            supabase.table("hooks")
            .select(
                "id, text, language, niche, city, hook_type, source, "
                "use_count, saturation_score, performance_score, last_used_at, created_at"
            )
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if niche:
            query = query.eq("niche", niche)
        if city:
            query = query.eq("city", city)
        if hook_type:
            query = query.eq("hook_type", hook_type)
        response = query.execute()
        return [HookItem(**row) for row in (response.data or [])]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("", response_model=HookItem, status_code=201)
async def create_hook(
    body: HookCreate,
    user: dict = Depends(get_current_user),
) -> HookItem:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    try:
        supabase = get_supabase()
        response = supabase.table("hooks").insert({
            "org_id": org_id,
            "text": body.text,
            "language": body.language,
            "niche": body.niche,
            "city": body.city,
            "hook_type": body.hook_type,
            "source": "manual",
            "use_count": 0,
            "saturation_score": 0.0,
            "performance_score": 0.0,
        }).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        return HookItem(**response.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
