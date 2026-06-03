"""Standalone Apify Instagram/Facebook reel scraper.

Usage:
    APIFY_API_TOKEN=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
    python apify_scraper.py --niche optical --platform instagram

Requires: httpx, supabase-py
"""
import argparse
import asyncio
import os
import httpx
from supabase import create_client

_NICHE_KEYWORDS: dict[str, list[str]] = {
    "optical": ["spectacles store", "optical glasses"],
    "real-estate": ["property sale", "plot real estate"],
    "hospital": ["hospital clinic", "doctor health"],
    "education": ["coaching center", "NEET tuition"],
    "restaurant": ["restaurant food", "biryani meals"],
    "clothing": ["saree fashion", "clothing boutique"],
    "jewellery": ["gold jewellery", "wedding jewel"],
    "pharmacy": ["pharmacy medical", "medicine store"],
    "agency": ["digital marketing", "social media ads"],
}


async def run(platform: str, niche: str, api_token: str, supabase_url: str, supabase_key: str) -> int:
    actor_map = {
        "instagram": "apify~instagram-reel-scraper",
        "facebook": "apify~facebook-reel-scraper",
    }
    actor_id = actor_map[platform]
    supabase = create_client(supabase_url, supabase_key)
    keywords = _NICHE_KEYWORDS.get(niche, [niche])[:2]
    stored = 0

    async with httpx.AsyncClient(timeout=120.0) as client:
        run_resp = await client.post(
            f"https://api.apify.com/v2/acts/{actor_id}/runs",
            headers={"Authorization": f"Bearer {api_token}"},
            json={"searchTerms": keywords, "resultsLimit": 20},
        )
        run_resp.raise_for_status()
        run_id = run_resp.json()["data"]["id"]

        status = "RUNNING"
        for _ in range(9):
            await asyncio.sleep(10)
            poll = await client.get(
                f"https://api.apify.com/v2/actor-runs/{run_id}",
                headers={"Authorization": f"Bearer {api_token}"},
            )
            status = poll.json()["data"]["status"]
            if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
                break

        if status != "SUCCEEDED":
            print(f"Apify run {run_id} ended with status {status}")
            return 0

        dataset_resp = await client.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
            headers={"Authorization": f"Bearer {api_token}"},
        )
        items = dataset_resp.json()

    for item in items:
        caption = (item.get("caption") or item.get("text") or "")
        if not caption:
            continue
        hook_text = caption.split("\n")[0][:200]
        url = item.get("url") or item.get("postUrl") or ""
        supabase.table("scraped_content").upsert(
            {
                "platform": platform,
                "url": url,
                "hook_text": hook_text,
                "views": item.get("videoViewCount") or item.get("viewCount") or 0,
                "likes": item.get("likesCount") or item.get("likes") or 0,
                "shares": item.get("sharesCount") or item.get("shares") or 0,
                "niche_tag": niche,
                "processed": False,
            },
            on_conflict="url",
        ).execute()
        stored += 1

    print(f"Stored {stored} {platform} hooks for niche '{niche}'")
    return stored


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--niche", required=True)
    parser.add_argument("--platform", default="instagram", choices=["instagram", "facebook"])
    args = parser.parse_args()
    asyncio.run(
        run(
            platform=args.platform,
            niche=args.niche,
            api_token=os.environ["APIFY_API_TOKEN"],
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    )
