from fastapi import APIRouter, Depends, HTTPException
from ..models.competitor import CompetitorRequest, CompetitorResult
from ..services.competitor_service import analyze_competitor
from ..core.auth import get_current_user

router = APIRouter(prefix="/competitors", tags=["competitors"])


@router.post("/analyze", response_model=CompetitorResult)
async def analyze_competitor_endpoint(
    body: CompetitorRequest,
    user: dict = Depends(get_current_user),
) -> CompetitorResult:
    try:
        return await analyze_competitor(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
