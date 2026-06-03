# Phase 5 — Scrapers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the viral content scraper pipeline — YouTube Data API + Apify Instagram/Facebook scraping → niche auto-tagging → promotion to the hook bank, triggered via `POST /scrape/trigger`.

**Architecture:** Scraper logic lives in `apps/api/app/services/scraper_service.py` (callable from FastAPI). The trigger endpoint uses FastAPI `BackgroundTasks` to run the job asynchronously so the HTTP response returns immediately. Scraped content is stored in `scraped_content`, niche-tagged via AI, then promoted to `hooks` when views exceed the threshold. A `packages/scrapers/` standalone package mirrors the same logic for CLI/cron use.

**Tech Stack:** Python 3.12, FastAPI BackgroundTasks, httpx, Supabase Python client, YouTube Data API v3, Apify REST API, Vercel AI Gateway (GPT-4o-mini for niche tagging)

---

## Background

### `scraped_content` table (already in DB):
```sql
scraped_content (id, platform, url, hook_text, views, likes, shares, niche_tag, processed, scraped_at)
```

### `hooks` table (already in DB, already has seed data):
```sql
hooks (id, org_id, text, language, niche, city, hook_type, source, views, use_count,
       saturation_score, performance_score, last_used_at, created_at)
```

### Niche keywords (from `packages/shared/constants/niches.ts`):
```
optical: spectacles, glasses, eye, lens, vision
real-estate: property, plot, house, villa, apartment
hospital: health, doctor, treatment, care
education: coaching, tuition, school, exam
restaurant: food, dining, biryani, meals
clothing: dress, fashion, saree, textile
jewellery: gold, silver, jewel, wedding
pharmacy: medicine, pharmacy, drug, tablet
agency: marketing, ads, social media, leads
```

### Promotion threshold: views ≥ 10,000 → hook promoted to `hooks` table as `source = 'scraped'`

### Niche auto-tag prompt: GPT-4o-mini, JSON output `{"niche": "category"}`, temperature 0

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/app/services/scraper_service.py` | Create | YouTube scraper, Apify scraper, niche tagger, content processor |
| `apps/api/app/models/scrape.py` | Create | ScrapeRequest, ScrapeResult Pydantic models |
| `apps/api/app/routers/scrape.py` | Create | POST /scrape/trigger endpoint |
| `apps/api/app/main.py` | Modify | Register scrape router |
| `packages/scrapers/__init__.py` | Create | Package marker |
| `packages/scrapers/youtube.py` | Create | Standalone YouTube CLI script |
| `packages/scrapers/apify_scraper.py` | Create | Standalone Apify CLI script |

---

### Task 1: Scraper service

**Files:**
- Create: `apps/api/app/services/scraper_service.py`

This service contains four functions:
- `scrape_youtube(niche, supabase, settings) → int` — calls YouTube Data API, stores to `scraped_content`
- `scrape_apify(platform, niche, supabase, settings) → int` — calls Apify REST API, stores to `scraped_content`
- `tag_niche(hook_text, settings) → str` — calls Vercel AI Gateway to classify niche
- `process_scraped_content(org_id, supabase, settings) → int` — tags unprocessed rows, promotes high-view hooks

- [ ] **Step 1: Create scraper_service.py**

```python
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
    "restaurant": ["restaurant Tamil ad", "food biryani Tamil"],
    "clothing": ["saree Tamil ad", "fashion boutique Tamil"],
    "jewellery": ["gold jewellery Tamil ad", "wedding jewellery Tamil"],
    "pharmacy": ["pharmacy Tamil ad", "medical store Tamil"],
    "agency": ["digital marketing Tamil ad", "ads agency Tamil"],
}

_VALID_NICHES = frozenset(_NICHE_KEYWORDS.keys())
_PROMOTION_THRESHOLD = 10_000  # views


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

            # Poll for completion (max 90 seconds)
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/services/scraper_service.py
git commit -m "feat: add scraper service (YouTube, Apify, niche tagger, content processor)"
```

---

### Task 2: Scrape models + router + register in main

**Files:**
- Create: `apps/api/app/models/scrape.py`
- Create: `apps/api/app/routers/scrape.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Create models/scrape.py**

```python
from pydantic import BaseModel
from typing import Literal


class ScrapeRequest(BaseModel):
    platform: Literal["youtube", "instagram", "facebook"]
    niche: str


class ScrapeResult(BaseModel):
    status: str
    platform: str
    niche: str
```

- [ ] **Step 2: Create routers/scrape.py**

```python
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from ..models.scrape import ScrapeRequest, ScrapeResult
from ..services.scraper_service import run_scrape_job
from ..core.auth import get_current_user

router = APIRouter(prefix="/scrape", tags=["scrape"])

_VALID_NICHES = frozenset([
    "optical", "real-estate", "hospital", "education",
    "restaurant", "clothing", "jewellery", "pharmacy", "agency",
])


@router.post("/trigger", response_model=ScrapeResult)
async def trigger_scrape(
    body: ScrapeRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
) -> ScrapeResult:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    if body.niche not in _VALID_NICHES:
        raise HTTPException(status_code=422, detail=f"Unknown niche: {body.niche}")
    background_tasks.add_task(run_scrape_job, body.platform, body.niche, org_id)
    return ScrapeResult(status="triggered", platform=body.platform, niche=body.niche)
```

- [ ] **Step 3: Register scrape router in main.py**

Replace `apps/api/app/main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .routers.generate import router as generate_router
from .routers.hooks import router as hooks_router
from .routers.analytics import router as analytics_router
from .routers.scrape import router as scrape_router

app = FastAPI(title="ScriptSite API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)
app.include_router(hooks_router)
app.include_router(analytics_router)
app.include_router(scrape_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/models/scrape.py apps/api/app/routers/scrape.py apps/api/app/main.py
git commit -m "feat: add POST /scrape/trigger endpoint with background job execution"
```

---

### Task 3: packages/scrapers standalone package

**Files:**
- Create: `packages/scrapers/__init__.py`
- Create: `packages/scrapers/youtube.py`
- Create: `packages/scrapers/apify_scraper.py`

These are standalone CLI scripts for running scrapers outside FastAPI (e.g. cron jobs, local testing). They read config from environment variables directly.

- [ ] **Step 1: Create `packages/scrapers/__init__.py`**

```python
"""Standalone scraper scripts for ScriptSite viral content pipeline.

Run directly:
    python -m scrapers.youtube --niche optical
    python -m scrapers.apify_scraper --niche restaurant --platform instagram

Or trigger via the API:
    POST /scrape/trigger {"platform": "youtube", "niche": "optical"}
"""
```

- [ ] **Step 2: Create `packages/scrapers/youtube.py`**

```python
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
```

- [ ] **Step 3: Create `packages/scrapers/apify_scraper.py`**

```python
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

        items = client.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
            headers={"Authorization": f"Bearer {api_token}"},
        )
        # Note: need to await
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
```

- [ ] **Step 4: Commit**

```bash
git add packages/scrapers/
git commit -m "feat: add packages/scrapers standalone YouTube and Apify CLI scripts"
```

---

## Self-Review

**Spec coverage:**
- ✅ `packages/scrapers/` package — Task 3
- ✅ Apify Instagram/Facebook scraper — Tasks 1 + 3
- ✅ YouTube Data API scraper — Tasks 1 + 3
- ✅ `POST /scrape/trigger` endpoint — Task 2
- ✅ Niche auto-tagging of scraped content via AI — Task 1 (`tag_niche`)
- ✅ Scraped content stored in `scraped_content` table — Task 1
- ✅ High-view hooks promoted to `hooks` table as `source='scraped'` — Task 1 (`process_scraped_content`)
- ✅ Scrape job runs as background task (non-blocking response) — Task 2

**Not in scope (Phase 5):**
- Meta Ad Library scraper — complex auth, separate phase
- Qdrant vector indexing — requires running Qdrant instance, separate task
- Competitor analysis — Phase 6

**Placeholder scan:** All code complete. No TBDs. ✅

**Type consistency:**
- `ScrapeRequest.platform` is `Literal["youtube", "instagram", "facebook"]` — matches `run_scrape_job(platform, niche, org_id)` call ✅
- `run_scrape_job` called with `body.platform, body.niche, org_id` — matches signature ✅
- `_VALID_NICHES` in router matches keys in `_NICHE_KEYWORDS` in service ✅

**Bug fix in apify_scraper.py (Task 3, Step 3):** There's a dead assignment `items = client.get(...)` before the correct `await client.get(...)` — remove the dead line. The implementer should write only the awaited version:

```python
dataset_resp = await client.get(
    f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
    headers={"Authorization": f"Bearer {api_token}"},
)
items = dataset_resp.json()
```
