# Phase 6 — Competitor Research + Offer Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Competitor Research feature (analyze a competitor's Instagram top posts via Apify + AI) and the Offer Analyzer (score and improve a marketing offer via AI), both exposed via API endpoints and a combined `/competitors` dashboard page.

**Architecture:** Two new services (`offer_service.py`, `competitor_service.py`) call the Vercel AI Gateway. Two new routers (`offer.py`, `competitors.py`) expose the endpoints. The frontend `/competitors` page has two sections: Offer Analyzer (top) and Competitor Analyzer (bottom), both as Client Components.

**Tech Stack:** Python 3.12, FastAPI, httpx, Vercel AI Gateway (Claude Haiku for offer scoring, GPT-4o for competitor analysis), Apify REST API, Next.js 14 App Router, Tailwind CSS, ShadCN UI

---

## Background

### Offer Analyzer
Input: offer text + niche + city + goal. Output: strength score (0–10), what's working, what's missing, 3 improved offer suggestions, recommended hook types.

Model: Claude Haiku (fast, cheap for scoring tasks — matches routing.py spec).

### Competitor Analyzer
Input: Instagram handle. Flow: trigger Apify `apify~instagram-profile-scraper` actor → poll for completion → extract top 10 posts by likes → AI analysis. Output: avg engagement, top content types, best post preview, recommended counter-strategy.

Model: GPT-4o for analysis (complex pattern recognition).

### Fallback
If Apify token missing, competitor analysis returns an error (unlike scrapers which silently return 0).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/app/services/offer_service.py` | Create | AI-powered offer scoring and improvement |
| `apps/api/app/services/competitor_service.py` | Create | Apify competitor scraping + AI analysis |
| `apps/api/app/models/offer.py` | Create | OfferAnalysisRequest, OfferAnalysisResult |
| `apps/api/app/models/competitor.py` | Create | CompetitorRequest, CompetitorResult, PostSummary |
| `apps/api/app/routers/offer.py` | Create | POST /analyze/offer |
| `apps/api/app/routers/competitors.py` | Create | POST /competitors/analyze |
| `apps/api/app/main.py` | Modify | Register both new routers |
| `packages/shared/types/competitor.ts` | Create | OfferAnalysis, CompetitorAnalysis TS types |
| `packages/shared/types/index.ts` | Modify | Export new types |
| `apps/web/src/lib/api-client/index.ts` | Modify | Add analyzeOffer(), analyzeCompetitor() |
| `apps/web/src/components/competitors/OfferAnalyzer.tsx` | Create | Offer analysis form + results |
| `apps/web/src/components/competitors/CompetitorAnalyzer.tsx` | Create | Competitor handle form + results |
| `apps/web/src/app/(dashboard)/competitors/page.tsx` | Create | Page combining both components |

---

### Task 1: Offer service + model + router

**Files:**
- Create: `apps/api/app/services/offer_service.py`
- Create: `apps/api/app/models/offer.py`
- Create: `apps/api/app/routers/offer.py`

- [ ] **Step 1: Create `apps/api/app/models/offer.py`**

```python
from pydantic import BaseModel
from typing import Optional


class OfferAnalysisRequest(BaseModel):
    offer: str
    niche: str
    city: Optional[str] = None
    goal: str = "leads"  # 'reach' | 'leads' | 'sales' | 'engagement'


class OfferAnalysisResult(BaseModel):
    strength_score: float  # 0–10
    whats_working: list[str]
    whats_missing: list[str]
    improved_offers: list[str]  # 3 improved versions
    recommended_hook_types: list[str]
```

- [ ] **Step 2: Create `apps/api/app/services/offer_service.py`**

```python
import json
import httpx
from ..core.config import settings
from ..models.offer import OfferAnalysisRequest, OfferAnalysisResult


async def analyze_offer(request: OfferAnalysisRequest) -> OfferAnalysisResult:
    prompt = (
        f"You are a marketing expert specializing in Tamil Nadu local business advertising.\n\n"
        f"Analyze this marketing offer for a {request.niche} business in "
        f"{request.city or 'Tamil Nadu'} with goal: {request.goal}.\n\n"
        f"OFFER: {request.offer}\n\n"
        f"Evaluate on these criteria:\n"
        f"- Specificity: Is the benefit concrete and measurable?\n"
        f"- Urgency: Does it create time/quantity pressure?\n"
        f"- Local relevance: Does it resonate with Tamil Nadu audience?\n"
        f"- Free element: Does it include a free trial/checkup/consultation?\n"
        f"- Trust signals: Does it include social proof or credibility?\n\n"
        f"Respond with JSON:\n"
        f'{{\n'
        f'  "strength_score": <0-10 float>,\n'
        f'  "whats_working": ["strength 1", "strength 2"],\n'
        f'  "whats_missing": ["gap 1", "gap 2"],\n'
        f'  "improved_offers": [\n'
        f'    "improved version 1 (add urgency)",\n'
        f'    "improved version 2 (add free element)",\n'
        f'    "improved version 3 (add social proof)"\n'
        f'  ],\n'
        f'  "recommended_hook_types": ["curiosity", "urgency"]\n'
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
                "model": "claude-haiku-4-5-20251001",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        data = json.loads(resp.json()["choices"][0]["message"]["content"])
    return OfferAnalysisResult(
        strength_score=min(max(float(data.get("strength_score", 5)), 0), 10),
        whats_working=data.get("whats_working", []),
        whats_missing=data.get("whats_missing", []),
        improved_offers=data.get("improved_offers", []),
        recommended_hook_types=data.get("recommended_hook_types", []),
    )
```

- [ ] **Step 3: Create `apps/api/app/routers/offer.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from ..models.offer import OfferAnalysisRequest, OfferAnalysisResult
from ..services.offer_service import analyze_offer
from ..core.auth import get_current_user

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/offer", response_model=OfferAnalysisResult)
async def analyze_offer_endpoint(
    body: OfferAnalysisRequest,
    user: dict = Depends(get_current_user),
) -> OfferAnalysisResult:
    try:
        return await analyze_offer(body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/models/offer.py apps/api/app/services/offer_service.py apps/api/app/routers/offer.py
git commit -m "feat: add offer analyzer service and POST /analyze/offer endpoint"
```

---

### Task 2: Competitor service + model + router + main.py

**Files:**
- Create: `apps/api/app/models/competitor.py`
- Create: `apps/api/app/services/competitor_service.py`
- Create: `apps/api/app/routers/competitors.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Create `apps/api/app/models/competitor.py`**

```python
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
```

- [ ] **Step 2: Create `apps/api/app/services/competitor_service.py`**

```python
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
```

- [ ] **Step 3: Create `apps/api/app/routers/competitors.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from ..models.competitor import CompetitorRequest, CompetitorResult
from ..services.competitor_service import analyze_competitor
from ..core.auth import get_current_user

router = APIRouter(prefix="/competitors", tags=["competitors"])


@router.post("/analyze", response_model=CompetitorResult)
async def analyze_competitor_endpoint(
    body: CompetitorRequest,
    user: dict = Depends(get_current_user),
) -> CompetitorResult:
    try:
        return await analyze_competitor(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

- [ ] **Step 4: Update `apps/api/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .routers.generate import router as generate_router
from .routers.hooks import router as hooks_router
from .routers.analytics import router as analytics_router
from .routers.scrape import router as scrape_router
from .routers.offer import router as offer_router
from .routers.competitors import router as competitors_router

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
app.include_router(offer_router)
app.include_router(competitors_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/models/competitor.py apps/api/app/services/competitor_service.py apps/api/app/routers/competitors.py apps/api/app/routers/offer.py apps/api/app/main.py
git commit -m "feat: add competitor analyzer service and POST /competitors/analyze endpoint"
```

---

### Task 3: Shared TypeScript types + API client

**Files:**
- Create: `packages/shared/types/competitor.ts`
- Modify: `packages/shared/types/index.ts`
- Modify: `apps/web/src/lib/api-client/index.ts`

- [ ] **Step 1: Create `packages/shared/types/competitor.ts`**

```typescript
export interface OfferAnalysisRequest {
  offer: string;
  niche: string;
  city?: string;
  goal?: string;
}

export interface OfferAnalysisResult {
  strength_score: number;
  whats_working: string[];
  whats_missing: string[];
  improved_offers: string[];
  recommended_hook_types: string[];
}

export interface CompetitorRequest {
  instagram_handle: string;
  niche?: string;
}

export interface PostSummary {
  caption_preview: string;
  likes: number;
  estimated_views: number;
}

export interface CompetitorResult {
  handle: string;
  posts_analyzed: number;
  avg_likes: number;
  top_content_types: string[];
  best_posts: PostSummary[];
  recommended_strategy: string;
  strengths: string[];
  gaps: string[];
}
```

- [ ] **Step 2: Update `packages/shared/types/index.ts`**

```typescript
export * from './business';
export * from './script';
export * from './campaign';
export * from './hook';
export * from './competitor';
```

- [ ] **Step 3: Update `apps/web/src/lib/api-client/index.ts`**

Add these imports and methods (keep all existing code, add at the end):

```typescript
import type {
  ScriptInput, ScriptOutput,
  Hook, HookCreateInput,
  Campaign, CampaignCreateInput,
  OfferAnalysisRequest, OfferAnalysisResult,
  CompetitorRequest, CompetitorResult,
} from '@scriptsite/shared/types'
```

Add to `apiClient`:
```typescript
  analyzeOffer: (input: OfferAnalysisRequest, token: string) =>
    apiFetch<OfferAnalysisResult>('/analyze/offer', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  analyzeCompetitor: (input: CompetitorRequest, token: string) =>
    apiFetch<CompetitorResult>('/competitors/analyze', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),
```

Full replacement of `apps/web/src/lib/api-client/index.ts`:

```typescript
import type {
  ScriptInput, ScriptOutput,
  Hook, HookCreateInput,
  Campaign, CampaignCreateInput,
  OfferAnalysisRequest, OfferAnalysisResult,
  CompetitorRequest, CompetitorResult,
} from '@scriptsite/shared/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options
  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((fetchOptions.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error((error as { detail?: string }).detail ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface HookFilters {
  niche?: string
  city?: string
  hook_type?: string
}

export const apiClient = {
  health: () =>
    apiFetch<{ status: string; version: string }>('/health'),

  generateScript: (input: ScriptInput, token: string) =>
    apiFetch<ScriptOutput>('/generate/script', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  getHooks: (filters: HookFilters, token: string) => {
    const params = new URLSearchParams()
    if (filters.niche) params.set('niche', filters.niche)
    if (filters.city) params.set('city', filters.city)
    if (filters.hook_type) params.set('hook_type', filters.hook_type)
    const qs = params.toString()
    return apiFetch<Hook[]>(`/hooks${qs ? `?${qs}` : ''}`, { token })
  },

  addHook: (input: HookCreateInput, token: string) =>
    apiFetch<Hook>('/hooks', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  logCampaign: (input: CampaignCreateInput, token: string) =>
    apiFetch<Campaign>('/analytics/campaign', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  getCampaigns: (token: string) =>
    apiFetch<Campaign[]>('/analytics/campaigns', { token }),

  getCampaign: (id: string, token: string) =>
    apiFetch<Campaign>(`/analytics/campaign/${id}`, { token }),

  analyzeOffer: (input: OfferAnalysisRequest, token: string) =>
    apiFetch<OfferAnalysisResult>('/analyze/offer', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  analyzeCompetitor: (input: CompetitorRequest, token: string) =>
    apiFetch<CompetitorResult>('/competitors/analyze', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/types/competitor.ts packages/shared/types/index.ts apps/web/src/lib/api-client/index.ts
git commit -m "feat: add OfferAnalysis and CompetitorResult shared types and API client methods"
```

---

### Task 4: OfferAnalyzer component

**Files:**
- Create: `apps/web/src/components/competitors/OfferAnalyzer.tsx`

- [ ] **Step 1: Create OfferAnalyzer.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { OfferAnalysisResult } from '@scriptsite/shared/types'

const NICHES = [
  { value: 'optical', label: 'Optical Store' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospital', label: 'Hospital / Clinic' },
  { value: 'education', label: 'Education' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'agency', label: 'Agency' },
]

const GOALS = [
  { value: 'leads', label: 'Lead Generation' },
  { value: 'reach', label: 'Reach' },
  { value: 'sales', label: 'Direct Sales' },
  { value: 'engagement', label: 'Engagement' },
]

function scoreColor(score: number) {
  if (score >= 7) return 'text-green-600'
  if (score >= 4) return 'text-yellow-600'
  return 'text-red-600'
}

export function OfferAnalyzer() {
  const [form, setForm] = useState({ offer: '', niche: 'optical', city: '', goal: 'leads' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OfferAnalysisResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const data = await apiClient.analyzeOffer(
        {
          offer: form.offer.trim(),
          niche: form.niche,
          city: form.city.trim() || undefined,
          goal: form.goal,
        },
        session.access_token,
      )
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer Analyzer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Your Offer</Label>
            <Input
              placeholder="e.g. Free eye checkup + 20% off all frames this week"
              value={form.offer}
              onChange={(e) => setForm((f) => ({ ...f, offer: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Niche</Label>
              <select
                value={form.niche}
                onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City (optional)</Label>
              <Input
                placeholder="e.g. Dharmapuri"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Goal</Label>
              <select
                value={form.goal}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Offer'}
          </Button>
        </form>

        {result && (
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">Strength score:</span>
              <span className={`text-2xl font-bold ${scoreColor(result.strength_score)}`}>
                {result.strength_score.toFixed(1)}/10
              </span>
            </div>

            {result.whats_working.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">What's working</p>
                <ul className="space-y-1">
                  {result.whats_working.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.whats_missing.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">What's missing</p>
                <ul className="space-y-1">
                  {result.whats_missing.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-red-400 flex-shrink-0">✗</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.improved_offers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Improved offers</p>
                <div className="space-y-2">
                  {result.improved_offers.map((offer, i) => (
                    <div key={i} className="bg-blue-50 rounded-md px-3 py-2 text-sm text-blue-900">
                      {i + 1}. {offer}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_hook_types.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500">Recommended hooks:</span>
                {result.recommended_hook_types.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/competitors/OfferAnalyzer.tsx
git commit -m "feat: add OfferAnalyzer component"
```

---

### Task 5: CompetitorAnalyzer component + page

**Files:**
- Create: `apps/web/src/components/competitors/CompetitorAnalyzer.tsx`
- Create: `apps/web/src/app/(dashboard)/competitors/page.tsx`

- [ ] **Step 1: Create CompetitorAnalyzer.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { CompetitorResult } from '@scriptsite/shared/types'

const NICHES = [
  { value: '', label: 'Auto-detect' },
  { value: 'optical', label: 'Optical Store' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospital', label: 'Hospital / Clinic' },
  { value: 'education', label: 'Education' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'agency', label: 'Agency' },
]

export function CompetitorAnalyzer() {
  const [handle, setHandle] = useState('')
  const [niche, setNiche] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompetitorResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const cleanHandle = handle.trim().replace(/^@/, '')
      const data = await apiClient.analyzeCompetitor(
        { instagram_handle: cleanHandle, niche: niche || undefined },
        session.access_token,
      )
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Research</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Instagram Handle</Label>
              <Input
                placeholder="@competitor_handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Niche (optional)</Label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Pulls their top 10 posts via Apify and analyzes content patterns. Takes ~90 seconds.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Analyzing (this takes ~90s)...' : 'Analyze Competitor'}
          </Button>
        </form>

        {result && (
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-xs text-zinc-500">Handle</p>
                <p className="font-semibold">@{result.handle}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Posts analyzed</p>
                <p className="font-semibold">{result.posts_analyzed}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Avg likes</p>
                <p className="font-semibold">{result.avg_likes.toLocaleString()}</p>
              </div>
            </div>

            {result.top_content_types.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Top content types</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.top_content_types.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Their strengths</p>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-zinc-700">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.gaps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Their gaps (your opportunity)</p>
                <ul className="space-y-1">
                  {result.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-green-500 flex-shrink-0">→</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.best_posts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Top posts</p>
                <div className="space-y-2">
                  {result.best_posts.map((post, i) => (
                    <div key={i} className="border rounded-md px-3 py-2">
                      <p className="text-sm text-zinc-700 leading-snug">{post.caption_preview || '(no caption)'}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-zinc-400">{post.likes.toLocaleString()} likes</span>
                        <span className="text-xs text-zinc-400">{post.estimated_views.toLocaleString()} views</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_strategy && (
              <div className="bg-zinc-50 rounded-md px-4 py-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Recommended strategy</p>
                <p className="text-sm text-zinc-800">{result.recommended_strategy}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `apps/web/src/app/(dashboard)/competitors/page.tsx`**

```tsx
import { OfferAnalyzer } from '@/components/competitors/OfferAnalyzer'
import { CompetitorAnalyzer } from '@/components/competitors/CompetitorAnalyzer'

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Competitors & Offers</h1>
        <p className="text-zinc-500 text-sm">
          Analyze your offer strength and research competitor Instagram strategies.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <OfferAnalyzer />
        <CompetitorAnalyzer />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/competitors/CompetitorAnalyzer.tsx "apps/web/src/app/(dashboard)/competitors/page.tsx"
git commit -m "feat: add CompetitorAnalyzer component and /competitors page"
```

---

## Self-Review

**Spec coverage:**
- ✅ `POST /competitors/analyze` — Task 2
- ✅ `POST /analyze/offer` — Task 1
- ✅ `offer_service.py` — Task 1
- ✅ `/competitors` page — Task 5
- ✅ Competitor analysis: pulls top posts via Apify, AI identifies best content type — Task 2
- ✅ Offer scoring and improvement suggestions — Task 1
- ✅ `OfferAnalyzer` component — Task 4
- ✅ `CompetitorAnalyzer` component — Task 5

**Placeholder scan:** All code complete. ✅

**Type consistency:**
- `OfferAnalysisRequest` / `OfferAnalysisResult` consistent across Python models, TS types, API client, component ✅
- `CompetitorRequest` / `CompetitorResult` / `PostSummary` consistent across Python models, TS types, API client, component ✅
- `analyzeOffer(input, token)` and `analyzeCompetitor(input, token)` match usage in components ✅
- `CompetitorResult.best_posts` is `PostSummary[]` — matches both Python and TypeScript definitions ✅

**Python type hint note:** `competitor_service.py` uses `niche: str | None` (Python 3.10+ union syntax) which is valid for Python 3.12. ✅
