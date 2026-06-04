import asyncio
import json
import httpx
from ..core.config import settings
from ..models.competitor import CompetitorRequest, CompetitorResult, PostSummary


async def analyze_competitor(request: CompetitorRequest) -> CompetitorResult:
    if not settings.apify_api_token:
        raise ValueError("APIFY_API_TOKEN not configured")

    posts = await _fetch_instagram_posts(request.instagram_handle)
    if not posts:
        raise ValueError(f"No posts found for @{request.instagram_handle}")

    return await _ai_analyze_posts(request.instagram_handle, posts, request.niche)


async def _fetch_instagram_posts(handle: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        run_resp = await client.post(
            "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs",
            headers={"Authorization": f"Bearer {settings.apify_api_token}"},
            json={"usernames": [handle], "resultsLimit": 10},
        )
        run_resp.raise_for_status()
        run_id = run_resp.json()["data"]["id"]

        status = "RUNNING"
        for _ in range(9):
            await asyncio.sleep(10)
            poll = await client.get(
                f"https://api.apify.com/v2/actor-runs/{run_id}",
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
            )
            status = poll.json()["data"]["status"]
            if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
                break

        if status != "SUCCEEDED":
            raise ValueError(f"Apify run ended with status: {status}")

        dataset_resp = await client.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
            headers={"Authorization": f"Bearer {settings.apify_api_token}"},
        )
        return dataset_resp.json()


async def _ai_analyze_posts(handle: str, posts: list[dict], niche: str | None) -> CompetitorResult:
    post_summaries = []
    for p in posts[:10]:
        caption = (p.get("caption") or "")[:150]
        likes = p.get("likesCount") or p.get("likes") or 0
        views = p.get("videoViewCount") or p.get("viewCount") or likes * 10
        post_summaries.append({"caption": caption, "likes": likes, "views": views})

    avg_likes = sum(p["likes"] for p in post_summaries) / len(post_summaries) if post_summaries else 0

    posts_text = "\n".join(
        f"{i+1}. Likes: {p['likes']} | Views: {p['views']} | Caption: {p['caption']}"
        for i, p in enumerate(post_summaries)
    )
    niche_context = f" in the {niche} niche" if niche else ""
    prompt = (
        f"Analyze this competitor's Instagram content{niche_context} for a Tamil Nadu marketing agency.\n\n"
        f"Competitor: @{handle}\n"
        f"Top posts:\n{posts_text}\n\n"
        f"Identify:\n"
        f"1. What content types get the most engagement\n"
        f"2. What hooks/angles they use most\n"
        f"3. Gaps in their strategy (what are they NOT doing well)\n"
        f"4. How to create content that outperforms them\n\n"
        f"Respond with JSON:\n"
        f'{{\n'
        f'  "top_content_types": ["type1", "type2", "type3"],\n'
        f'  "strengths": ["strength1", "strength2"],\n'
        f'  "gaps": ["gap1", "gap2"],\n'
        f'  "recommended_strategy": "2-3 sentence counter-strategy for our client"\n'
        f'}}'
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.vercel_ai_gateway_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.vercel_ai_gateway_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.5,
            },
        )
        resp.raise_for_status()
        data = json.loads(resp.json()["choices"][0]["message"]["content"])

    best_posts = sorted(post_summaries, key=lambda p: p["likes"], reverse=True)[:3]
    return CompetitorResult(
        handle=handle,
        posts_analyzed=len(post_summaries),
        avg_likes=round(avg_likes, 1),
        top_content_types=data.get("top_content_types", []),
        best_posts=[
            PostSummary(
                caption_preview=p["caption"][:100],
                likes=p["likes"],
                estimated_views=p["views"],
            )
            for p in best_posts
        ],
        recommended_strategy=data.get("recommended_strategy", ""),
        strengths=data.get("strengths", []),
        gaps=data.get("gaps", []),
    )
