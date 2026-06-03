from pydantic import BaseModel
from typing import Optional


class HookItem(BaseModel):
    id: str
    text: str
    language: str
    niche: str
    city: Optional[str] = None
    hook_type: Optional[str] = None
    source: str
    use_count: int
    saturation_score: float
    performance_score: float
    last_used_at: Optional[str] = None
    created_at: str


class HookCreate(BaseModel):
    text: str
    language: str = "tanglish"
    niche: str
    city: Optional[str] = None
    hook_type: Optional[str] = None
