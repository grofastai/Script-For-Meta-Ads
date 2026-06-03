from pydantic import BaseModel
from typing import Optional


class CampaignCreate(BaseModel):
    script_id: Optional[str] = None
    business_id: Optional[str] = None
    goal: str  # 'reach' | 'leads' | 'sales' | 'engagement'
    reach: int = 0
    leads: int = 0
    cost: float = 0.0
    notes: Optional[str] = None


class CampaignItem(BaseModel):
    id: str
    org_id: str
    script_id: Optional[str] = None
    business_id: Optional[str] = None
    goal: str
    reach: int
    leads: int
    cost: float
    cpl: Optional[float] = None
    notes: Optional[str] = None
    created_at: str
