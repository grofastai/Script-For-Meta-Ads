import asyncio
import json
import httpx
from ..core.config import settings as _settings
from ..core.database import get_supabase

_NICHE_KEYWORDS: dict[str, list[str]] = {
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

_VALID_NICHES = frozenset(_NICHE_KEYWORDS.keys())
_PROMOTION_THRESHOLD = 10_000


async def scrape_youtube(niche: str, supabase, cfg=None) -> int:
    cfg = cfg or _settings
    if not cfg.youtube_api_key:
        return 0
    queries = _NICHE_KEYWORDS.get(niche, [f"{niche} Tamil ad"])
    stored = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in queries[:2]:
            try:
                resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={
                        "part": "snippet",
                        "q": query,
                        "type": "video",
                        "regionCode": "IN",
                        "relevanceLanguage": "ta",
                        "maxResults": 20,
                        "key": cfg.youtube_api_key,
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
            except Exception:
                pass
    return stored


async def scrape_apify(platform: str, niche: str, supabase, cfg=None) -> int:
    cfg = cfg or _settings
    if not cfg.apify_api_token:
        return 0
    actor_map = {
        "instagram": "apify~instagram-reel-scraper",
        "facebook": "apify~facebook-reel-scraper",
    }
    actor_id = actor_map.get(platform)
    if not actor_id:
        return 0
    keywords = [q.replace(" Tamil ad", "").replace(" Tamil", "") for q in _NICHE_KEYWORDS.get(niche, [niche])[:2]]
    stored = 0
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            run_resp = await client.post(
                f"https://api.apify.com/v2/acts/{actor_id}/runs",
                headers={"Authorization": f"Bearer {cfg.apify_api_token}"},
                json={"searchTerms": keywords, "resultsLimit": 20},
            )
            run_resp.raise_for_status()
            run_id = run_resp.json()["data"]["id"]

            status = "RUNNING"
            for _ in range(9):
                await asyncio.sleep(10)
                poll = await client.get(
                    f"https://api.apify.com/v2/actor-runs/{run_id}",
                    headers={"Authorization": f"Bearer {cfg.apify_api_token}"},
                )
                status = poll.json()["data"]["status"]
                if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
                    break

            if status != "SUCCEEDED":
                return 0

            dataset_resp = await client.get(
                f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
                headers={"Authorization": f"Bearer {cfg.apify_api_token}"},
            )
            items = dataset_resp.json()
        except Exception:
            return 0

    for item in items:
        caption = (item.get("caption") or item.get("text") or "")
        if not caption:
            continue
        hook_text = caption.split("\n")[0][:200]
        url = item.get("url") or item.get("postUrl") or ""
        try:
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
        except Exception:
            pass
    return stored


async def tag_niche(hook_text: str, cfg=None) -> str:
    cfg = cfg or _settings
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{cfg.vercel_ai_gateway_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {cfg.vercel_ai_gateway_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Classify this Tamil Nadu social media hook into EXACTLY ONE category.\n"
                            "Categories: optical, real-estate, hospital, education, restaurant, "
                            "clothing, jewellery, pharmacy, agency\n\n"
                            f"Hook: {hook_text}\n\n"
                            'Respond with JSON only: {"niche": "category"}'
                        ),
                    }
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
        )
        resp.raise_for_status()
        data = json.loads(resp.json()["choices"][0]["message"]["content"])
        niche = data.get("niche", "")
        return niche if niche in _VALID_NICHES else "optical"


async def process_scraped_content(org_id: str, supabase=None, cfg=None) -> int:
    supabase = supabase or get_supabase()
    cfg = cfg or _settings
    rows = (
        supabase.table("scraped_content")
        .select("*")
        .eq("processed", False)
        .limit(50)
        .execute()
    ).data or []

    promoted = 0
    for row in rows:
        hook_text = row.get("hook_text", "")
        if not hook_text:
            supabase.table("scraped_content").update({"processed": True}).eq("id", row["id"]).execute()
            continue

        niche = row.get("niche_tag") or ""
        if niche not in _VALID_NICHES:
            try:
                niche = await tag_niche(hook_text, cfg)
            except Exception:
                niche = "optical"

        supabase.table("scraped_content").update({
            "niche_tag": niche,
            "processed": True,
        }).eq("id", row["id"]).execute()

        views = row.get("views") or 0
        if views >= _PROMOTION_THRESHOLD:
            try:
                supabase.table("hooks").insert({
                    "org_id": org_id,
                    "text": hook_text,
                    "language": "tanglish",
                    "niche": niche,
                    "city": None,
                    "source": "scraped",
                    "views": views,
                    "use_count": 0,
                    "saturation_score": 0.0,
                    "performance_score": 0.0,
                }).execute()
                promoted += 1
            except Exception:
                pass

    return promoted


async def run_scrape_job(platform: str, niche: str, org_id: str) -> dict:
    """Full pipeline: scrape → process → return counts."""
    supabase = get_supabase()
    scraped = 0
    if platform == "youtube":
        scraped = await scrape_youtube(niche, supabase)
    elif platform in ("instagram", "facebook"):
        scraped = await scrape_apify(platform, niche, supabase)
    promoted = await process_scraped_content(org_id, supabase)
    return {"scraped": scraped, "promoted": promoted}
