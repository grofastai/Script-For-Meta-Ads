from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from ..models.scrape import ScrapeRequest, ScrapeResult
from ..services.scraper_service import run_scrape_job
from ..core.auth import get_current_user

router = APIRouter(prefix="/scrape", tags=["scrape"])

_VALID_NICHES = frozenset([
    "optical", "real-estate", "hospital", "education",
    "restaurant", "clothing", "jewellery", "pharmacy", "agency",
])


@router.post("/trigger", response_model=ScrapeResult)
async def trigger_scrape(
    body: ScrapeRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
) -> ScrapeResult:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    if body.niche not in _VALID_NICHES:
        raise HTTPException(status_code=422, detail=f"Unknown niche: {body.niche}")
    background_tasks.add_task(run_scrape_job, body.platform, body.niche, org_id)
    return ScrapeResult(status="triggered", platform=body.platform, niche=body.niche)
