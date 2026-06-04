from pydantic import BaseModel
from typing import Optional


class OfferAnalysisRequest(BaseModel):
    offer: str
    niche: str
    city: Optional[str] = None
    goal: str = "leads"  # 'reach' | 'leads' | 'sales' | 'engagement'


class OfferAnalysisResult(BaseModel):
    strength_score: float  # 0–10
    whats_working: list[str]
    whats_missing: list[str]
    improved_offers: list[str]  # 3 improved versions
    recommended_hook_types: list[str]
