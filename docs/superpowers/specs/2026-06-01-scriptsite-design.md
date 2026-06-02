# ScriptSite — AI Viral Script Intelligence Platform
**Design Spec** | 2026-06-01

---

## Overview

ScriptSite is an AI-powered marketing intelligence platform built for Tamil Nadu / South Indian agencies. It generates viral hooks, scripts, captions, and ad copy tailored to specific business types, cities, target audiences, and campaign goals. Built as an internal tool for Grofast agency first, designed for SaaS from day one.

---

## Goals

- Generate accurate, locally-relevant scripts (Tanglish + Tamil) for clients across Dharmapuri, Krishnagiri, Salem, Chennai, and surrounding districts
- Replace manual script writing with AI that learns from real campaign performance
- Give agency teams a full campaign output in under 2 minutes: hook, script, CTA, caption, hashtags, posting time, ad copy
- Build a hook and viral content database that gets smarter over time

---

## Non-Goals (MVP)

- Mobile app
- White-label reselling to other agencies (Phase 2)
- Automated publishing to social platforms
- Payment/billing (Phase 2 when going SaaS)

---

## Users

| Role | Description |
|------|-------------|
| Agency Staff | Grofast team members who generate scripts for clients |
| Admin | Manages business profiles, reviews AI output quality |
| (Future) Agency Owner | SaaS client who manages their own team |

---

## Architecture

### Repository: Turborepo Monorepo

```
scriptsite/
├── apps/
│   ├── web/          ← Next.js 14 App Router (frontend)
│   └── api/          ← Python FastAPI (backend engine)
├── packages/
│   ├── ai-engine/    ← Prompt templates + Vercel AI Gateway routing
│   ├── scrapers/     ← Apify, YouTube API, Meta Ad Library
│   ├── db/           ← Supabase schema, migrations, generated types
│   └── shared/       ← Shared TypeScript types and constants
├── docs/
├── turbo.json
├── CLAUDE.md
└── package.json
```

---

## Apps

### apps/web (Next.js 14 App Router)

**Stack:** Next.js 14, Tailwind CSS, ShadCN UI, TypeScript

**Pages:**

| Route | Purpose |
|-------|---------|
| `/login` `/signup` | Supabase Auth |
| `/dashboard` | Overview: recent scripts, campaign stats |
| `/generate` | Main feature: script + hook generator form |
| `/hooks` | Hook library with saturation scores |
| `/campaigns` | Campaign performance tracker (leads, CPL) |
| `/competitors` | Competitor page analysis |
| `/content-calendar` | Posting schedule + festival calendar |
| `/settings` | Business profiles, cities, niches |

**Key components:**
- `GeneratorForm` — collects Business Type, City, Target Audience, Offer, Budget, Goal
- `ScriptOutput` — displays hook variants, full script, CTA, caption, hashtags, posting time
- `HookBank` — browsable hook library with filters (niche, city, freshness, performance score)
- `CampaignTracker` — log actual results (leads, CPL) against a generated script
- `PerformanceChart` — shows which hooks and script types perform best

**Supabase integration:**
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — server component client
- Auth handled entirely by Supabase (magic link + email/password)

---

### apps/api (Python FastAPI)

**Stack:** Python 3.12, FastAPI, Pydantic v2, httpx, Supabase Python client

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/generate/script` | Main generation endpoint |
| POST | `/generate/hooks` | Generate hook variants only |
| POST | `/analyze/offer` | Score and improve an offer |
| GET | `/hooks` | Retrieve hooks from database (filtered) |
| POST | `/scrape/trigger` | Trigger a scraping job |
| POST | `/competitors/analyze` | Analyze a competitor page |
| GET | `/analytics/campaign/:id` | Get performance data for a script |
| POST | `/analytics/campaign` | Log campaign results |

**Services:**
- `ai_service.py` — sends requests to Vercel AI Gateway, handles model routing, retries
- `script_service.py` — assembles prompt from templates, calls ai_service, post-processes output
- `hook_service.py` — retrieves relevant hooks from Supabase + Qdrant, scores for saturation
- `offer_service.py` — scores offer strength, suggests improvements
- `scraper_service.py` — triggers Apify actors, processes YouTube API responses

**Auth:** Every request validated via Supabase JWT. FastAPI middleware extracts user/org from token.

---

## Packages

### packages/ai-engine

Prompt templates and model routing rules. Pure text files and one routing config.

**Prompt template structure:**
```
prompts/
├── hooks/
│   ├── optical.txt       ← Few-shot hook examples for optical stores
│   ├── real-estate.txt
│   ├── hospital.txt
│   └── education.txt
├── scripts/
│   ├── lead-script.txt
│   ├── story-script.txt
│   ├── offer-script.txt
│   └── testimonial-script.txt
└── audience/
    ├── dharmapuri.txt    ← City psychology profile injected into every prompt
    ├── chennai.txt
    ├── salem.txt
    └── krishnagiri.txt
```

**Model routing (`routing.py`):**

| Task | Primary Model | Fallback |
|------|--------------|---------|
| Hook generation | GPT-4o | Claude Sonnet |
| Story scripts | Claude Sonnet | GPT-4o |
| Trend analysis | Gemini Flash | GPT-4o |
| Offer scoring | Claude Haiku | GPT-4o-mini |

All calls go through **Vercel AI Gateway** — single endpoint, observability, automatic fallback.

**Accuracy mechanism:**
- Every generation call includes: 3–5 few-shot examples pulled from the `hooks` table WHERE `performance_score > 0.7` AND `niche = input.niche` AND `city = input.city`
- This grounds the AI in what actually worked for that specific niche + city combination

---

### packages/scrapers

**Instagram + Facebook:** Apify actors (`apify/instagram-reel-scraper`, `apify/facebook-reel-scraper`)
- Run on schedule (every 3 days)
- Extract: hook text (first 3 seconds caption), views, likes, shares, duration, niche tag
- Store in `scraped_content` table

**YouTube:** Official YouTube Data API v3
- Search by niche keywords + Tamil region filter
- Extract: title (hook), view count, like count, publish date
- Store in `scraped_content` table

**Meta Ad Library:** Custom scraper using Meta's public Ad Library search
- Track ads running 30+ days in target niches
- Flag as "proven converter" if active 90+ days
- Store in `meta_ads` table

**Competitor analysis:** Given a competitor's Instagram handle, uses Apify to pull their top 10 posts, calculates avg engagement, identifies best-performing content type.

---

### packages/db

**Supabase project** — single database for all data.

**Core tables:**

```sql
-- Business profiles
businesses (id, org_id, name, niche, city, target_audience, created_at)

-- Hook bank (manual + scraped)
hooks (id, text, language, niche, city, source, views, saturation_score,
       performance_score, last_used_at, created_at)

-- Every generated script
scripts (id, business_id, user_id, input_params jsonb, output jsonb,
         hook_id, model_used, created_at)

-- Campaign performance (logged manually or via future integrations)
campaigns (id, script_id, business_id, goal, reach, leads, cost,
           cpl, notes, created_at)

-- Raw scraped content (before processing into hooks)
scraped_content (id, platform, url, hook_text, views, likes, shares,
                 niche_tag, scraped_at)

-- Meta ads intelligence
meta_ads (id, advertiser, niche, city, offer_type, days_active,
          creative_type, first_seen, last_seen)

-- For SaaS: organization isolation
organizations (id, name, plan, created_at)
users (id, org_id, email, role, created_at)  -- extends Supabase auth.users
```

**Vector store (Qdrant):**
- Hook embeddings indexed by niche + city for semantic similarity search
- Used to find "hooks like this one that performed well"

**Row Level Security (RLS):** All tables scoped to `org_id` from day one — multi-tenancy ready.

---

### packages/shared

TypeScript types shared between `apps/web` and any future TypeScript packages.

```
types/
├── business.ts    ← BusinessType, NicheCategory, CityName
├── script.ts      ← ScriptInput, ScriptOutput, HookVariant
└── campaign.ts    ← CampaignResult, PerformanceMetrics

constants/
├── cities.ts      ← Tamil Nadu cities with psychology tags
├── niches.ts      ← Business categories (optical, real-estate, hospital, etc.)
└── hooks.ts       ← Hook type classifications (curiosity, urgency, local, problem-solution)
```

---

## Data Flow

```
1. User fills GeneratorForm
   → Business Type + City + Target Audience + Offer + Budget + Goal

2. apps/web POST /generate/script to apps/api

3. FastAPI script_service:
   a. Pulls city psychology profile from ai-engine/prompts/audience/
   b. Pulls niche hook template from ai-engine/prompts/hooks/
   c. Fetches top 5 high-performing hooks from Supabase (same niche + city)
   d. Assembles final prompt with all context

4. ai_service sends to Vercel AI Gateway
   → Returns 3 hook variants + full script + CTA + caption + hashtags + posting time

5. hook_service scores each hook variant:
   → Saturation check (how many times used in last 30 days)
   → Returns freshness score

6. Response returned to frontend, ranked by freshness + past performance

7. User selects preferred script → saved to scripts table
   → Campaign tracker entry created (no results yet)

8. (Later) User logs campaign results → campaigns table updated
   → hook performance_score recalculated

Background jobs (scrapers, run every 3 days):
   Apify/YouTube → scraped_content → hook extraction → hooks table → Qdrant re-index
```

---

## Local Development Setup

```
# Prerequisites
Node.js 20+, Python 3.12+, pnpm, Docker (for Qdrant)

# Install
pnpm install

# Environment
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Run all
pnpm dev          ← starts web (port 3000) + api (port 8000) in parallel

# Run individually
pnpm dev --filter=web
pnpm dev --filter=api
```

---

## Environment Variables

### apps/web
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### apps/api
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VERCEL_AI_GATEWAY_URL=
VERCEL_AI_GATEWAY_KEY=
QDRANT_URL=
QDRANT_API_KEY=
APIFY_API_TOKEN=
YOUTUBE_API_KEY=
```

---

## Accuracy Strategy

The system gets more accurate over time through 4 mechanisms:

1. **Few-shot grounding** — every generation uses real past winning hooks as examples
2. **Saturation detection** — hooks used too often get a lower freshness score and are deprioritized
3. **Performance feedback** — when campaign results are logged, hook and script scores update
4. **City psychology injection** — every prompt includes the city's audience psychology profile so the AI never generates generic content

---

## Phase Plan

| Phase | Scope |
|-------|-------|
| 1 | DB schema + Supabase setup + monorepo scaffold |
| 2 | Script Generator (core feature) — GeneratorForm + FastAPI + AI Gateway |
| 3 | Hook Bank — view, filter, add hooks manually |
| 4 | Campaign Tracker — log results, update performance scores |
| 5 | Scrapers — Apify + YouTube pipeline feeds hook bank automatically |
| 6 | Competitor Research + Offer Analyzer |
| 7 | Content Calendar + Posting Intelligence |
| 8 | SaaS features — org management, billing (Stripe), multi-tenant |
