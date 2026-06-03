from fastapi import APIRouter, Depends, HTTPException
from ..models.campaign import CampaignCreate, CampaignItem
from ..core.auth import get_current_user
from ..core.database import get_supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _recalculate_hook_score(
    supabase,
    script_id: str,
    leads: int,
    reach: int,
    org_id: str,
) -> None:
    """Update the hook's performance_score after a campaign is logged."""
    if reach <= 0:
        return
    score = min(leads / (reach * 0.01), 1.0)
    script_row = (
        supabase.table("scripts")
        .select("hook_id")
        .eq("id", script_id)
        .eq("org_id", org_id)
        .maybe_single()
        .execute()
    )
    if not script_row.data or not script_row.data.get("hook_id"):
        return
    hook_id = script_row.data["hook_id"]
    supabase.table("hooks").update({"performance_score": score}).eq("id", hook_id).execute()


@router.post("/campaign", response_model=CampaignItem, status_code=201)
async def log_campaign(
    body: CampaignCreate,
    user: dict = Depends(get_current_user),
) -> CampaignItem:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    cpl = round(body.cost / body.leads, 2) if body.leads > 0 else None
    try:
        supabase = get_supabase()
        response = supabase.table("campaigns").insert({
            "org_id": org_id,
            "script_id": body.script_id,
            "business_id": body.business_id,
            "goal": body.goal,
            "reach": body.reach,
            "leads": body.leads,
            "cost": body.cost,
            "cpl": cpl,
            "notes": body.notes,
        }).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        campaign = CampaignItem(**response.data[0])
        if body.script_id:
            try:
                _recalculate_hook_score(supabase, body.script_id, body.leads, body.reach, org_id)
            except Exception:
                pass  # score recalculation failure must not block the response
        return campaign
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/campaign/{campaign_id}", response_model=CampaignItem)
async def get_campaign(
    campaign_id: str,
    user: dict = Depends(get_current_user),
) -> CampaignItem:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    try:
        supabase = get_supabase()
        response = (
            supabase.table("campaigns")
            .select("*")
            .eq("id", campaign_id)
            .eq("org_id", org_id)
            .maybe_single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return CampaignItem(**response.data)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/campaigns", response_model=list[CampaignItem])
async def list_campaigns(
    user: dict = Depends(get_current_user),
) -> list[CampaignItem]:
    org_id = user.get("org_id")
    if not org_id:
        return []
    try:
        supabase = get_supabase()
        response = (
            supabase.table("campaigns")
            .select("*")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [CampaignItem(**row) for row in (response.data or [])]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
