from pydantic import BaseModel
from typing import Optional


class ScriptRequest(BaseModel):
    niche: str
    city: str
    target_audience: str
    offer: str
    goal: str  # 'reach' | 'leads' | 'sales' | 'engagement'
    language: str  # 'tanglish' | 'english' | 'tamil'
    budget: Optional[float] = None
    business_name: Optional[str] = None


class HookVariant(BaseModel):
    text: str
    type: str  # 'curiosity' | 'urgency' | 'local' | 'problem-solution' | 'social-proof'
    freshness_score: float


class ScriptResponse(BaseModel):
    hooks: list[HookVariant]
    selected_hook: HookVariant
    script: str
    cta: str
    caption: str
    hashtags: list[str]
    posting_time: str
    ad_copy: str
    video_structure: str
    shot_list: list[str]
