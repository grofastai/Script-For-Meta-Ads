from pydantic import BaseModel
from typing import Optional


class CompetitorRequest(BaseModel):
    instagram_handle: str
    niche: Optional[str] = None


class PostSummary(BaseModel):
    caption_preview: str
    likes: int
    estimated_views: int


class CompetitorResult(BaseModel):
    handle: str
    posts_analyzed: int
    avg_likes: float
    top_content_types: list[str]
    best_posts: list[PostSummary]
    recommended_strategy: str
    strengths: list[str]
    gaps: list[str]
