"""Standalone YouTube Data API v3 scraper.

Usage:
    YOUTUBE_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
    python youtube.py --niche optical

Requires: httpx, supabase-py
"""
import argparse
import asyncio
import os
import httpx
from supabase import create_client

_NICHE_QUERIES: dict[str, list[str]] = {
    "optical": ["spectacles Tamil ad", "glasses optical store Tamil"],
    "real-estate": ["property Tamil ad", "plot sale Tamil"],
    "hospital": ["hospital Tamil ad", "doctor clinic Tamil"],
    "education": ["coaching Tamil ad", "NEET coaching Tamil"],
    "restaurant": ["restaurant Tamil ad", "biryani food Tamil"],
    "clothing": ["saree Tamil ad", "fashion boutique Tamil"],
    "jewellery": ["gold jewellery Tamil ad", "wedding jewellery Tamil"],
    "pharmacy": ["pharmacy Tamil ad", "medical store Tamil"],
    "agency": ["digital marketing Tamil ad", "ads agency Tamil"],
}


async def run(niche: str, api_key: str, supabase_url: str, supabase_key: str) -> int:
    supabase = create_client(supabase_url, supabase_key)
    queries = _NICHE_QUERIES.get(niche, [f"{niche} Tamil ad"])
    stored = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in queries[:2]:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "regionCode": "IN",
                    "relevanceLanguage": "ta",
                    "maxResults": 20,
                    "key": api_key,
                },
            )
            resp.raise_for_status()
            for item in resp.json().get("items", []):
                title = item.get("snippet", {}).get("title", "")
                video_id = item.get("id", {}).get("videoId", "")
                if not title or not video_id:
                    continue
                supabase.table("scraped_content").upsert(
                    {
                        "platform": "youtube",
                        "url": f"https://youtube.com/watch?v={video_id}",
                        "hook_text": title[:200],
                        "niche_tag": niche,
                        "processed": False,
                    },
                    on_conflict="url",
                ).execute()
                stored += 1
    print(f"Stored {stored} YouTube hooks for niche '{niche}'")
    return stored


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--niche", required=True)
    args = parser.parse_args()
    asyncio.run(
        run(
            niche=args.niche,
            api_key=os.environ["YOUTUBE_API_KEY"],
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    )
