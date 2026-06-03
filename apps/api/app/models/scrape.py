from pydantic import BaseModel
from typing import Literal


class ScrapeRequest(BaseModel):
    platform: Literal["youtube", "instagram", "facebook"]
    niche: str


class ScrapeResult(BaseModel):
    status: str
    platform: str
    niche: str
