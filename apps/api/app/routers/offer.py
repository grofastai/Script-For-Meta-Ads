from fastapi import APIRouter, Depends, HTTPException
from ..models.offer import OfferAnalysisRequest, OfferAnalysisResult
from ..services.offer_service import analyze_offer
from ..core.auth import get_current_user

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/offer", response_model=OfferAnalysisResult)
async def analyze_offer_endpoint(
    body: OfferAnalysisRequest,
    user: dict = Depends(get_current_user),
) -> OfferAnalysisResult:
    try:
        return await analyze_offer(body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
