# ScriptSite — CLAUDE.md

AI coding assistant instructions for this project.

---

## What This Project Is

ScriptSite is an AI Viral Script Intelligence Platform for Tamil Nadu marketing agencies. It generates hooks, scripts, captions, and ad copy tailored to specific business types, cities, and campaign goals. Internal tool for Grofast agency first; architected for SaaS.

Full design spec: `docs/superpowers/specs/2026-06-01-scriptsite-design.md`

---

## Repository Structure

```
apps/web        ← Next.js 14 App Router frontend (TypeScript)
apps/api        ← Python FastAPI backend
packages/ai-engine  ← Prompt templates + Vercel AI Gateway routing
packages/scrapers   ← Apify, YouTube API, Meta Ad Library scrapers
packages/db         ← Supabase schema, migrations, generated types
packages/shared     ← Shared TypeScript types and constants
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, Tailwind CSS, ShadCN UI |
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| Auth + Database | Supabase (PostgreSQL + Auth + Storage) |
| Vector Search | Qdrant |
| AI | Vercel AI Gateway (routes to Claude, GPT-4o, Gemini) |
| Build | Turborepo + pnpm workspaces |
| Scraping | Apify (Instagram/Facebook), YouTube Data API v3, Meta Ad Library |

---

## Development Commands

```bash
pnpm install          # install all dependencies
pnpm dev              # start web (3000) + api (8000) in parallel
pnpm dev --filter=web # frontend only
pnpm dev --filter=api # backend only
pnpm build            # build all apps
pnpm lint             # lint all apps
pnpm typecheck        # TypeScript check
```

---

## Key Conventions

### Frontend (apps/web)

- Use Next.js App Router. Never use `pages/` directory.
- Server Components by default. Only add `"use client"` when needed (event handlers, hooks, browser APIs).
- Use ShadCN UI components from `components/ui/`. Do not write raw HTML for standard UI elements.
- Tailwind only — no CSS modules, no styled-components.
- All API calls go through `lib/api-client/` — never call FastAPI directly from components.
- Supabase auth uses `lib/supabase/server.ts` in Server Components, `lib/supabase/client.ts` in Client Components.

### Backend (apps/api)

- All endpoints use Pydantic v2 models for request/response validation.
- Every endpoint requires Supabase JWT auth. Use the `get_current_user` dependency.
- Business logic lives in `services/` — routers only validate input and call services.
- All AI calls go through `services/ai_service.py` via Vercel AI Gateway. Never import OpenAI, Anthropic, or Google SDKs directly.
- Supabase `org_id` must be used in every database query for multi-tenant isolation.

### AI Engine (packages/ai-engine)

- Prompt templates are plain `.txt` files — no code in prompt files.
- Every generation prompt MUST include: city psychology profile + niche hook examples + few-shot examples from the hook bank.
- Model routing is defined in `routing.py` — do not hardcode model names in services.

### Database (packages/db)

- All schema changes go through Supabase migrations in `packages/db/migrations/`.
- Never modify the database schema directly via Supabase dashboard — always use migrations.
- Every table must have `org_id` for RLS. Row Level Security must be enabled on all tables.
- TypeScript types are auto-generated from the schema — do not hand-write DB types.

### Shared Types (packages/shared)

- Types used in both frontend and backend live here.
- Keep types pure — no logic, no imports from apps.

---

## Critical Accuracy Rules

These rules exist because generic AI output is the main failure mode for this product.

1. **Always inject city psychology** — every script generation must include the city profile from `packages/ai-engine/prompts/audience/`. Never generate without it.
2. **Always include few-shot examples** — pull 3–5 top-performing hooks from Supabase (`performance_score > 0.7`, same niche + city) before generating. If none exist, use the niche template defaults.
3. **Always check saturation** — after generating hooks, run saturation check. Deprioritize hooks used more than 10 times in the last 30 days.
4. **Performance score formula** — `performance_score = leads / (reach * 0.01)`, capped at 1.0. Recalculate when campaign results are logged.
5. **Niche tagging for scraped content** — before storing a scraped hook, call the AI to classify its niche. Do not store untagged hooks.

---

## Environment Variables

See `apps/web/.env.example` and `apps/api/.env.example` for required variables.

Never commit `.env` files. Never hardcode API keys.

---

## What NOT to Do

- Do not use `pages/` directory in Next.js — App Router only.
- Do not call AI providers (OpenAI, Anthropic, Google) directly — route through Vercel AI Gateway.
- Do not write database queries in route handlers — always use service layer.
- Do not generate scripts without city psychology and few-shot examples injected.
- Do not store scraped hooks without niche classification.
- Do not add new Supabase tables without RLS policies.
- Do not use mock data in production code — all data comes from Supabase.

---

## Module → File Mapping

| Module (from spec) | Location |
|-------------------|---------|
| Script Generator | `apps/api/app/services/script_service.py` + `apps/web/src/app/(dashboard)/generate/` |
| Hook Prediction Engine | `apps/api/app/services/hook_service.py` |
| Audience Psychology Engine | `packages/ai-engine/prompts/audience/` |
| Offer Analyzer | `apps/api/app/services/offer_service.py` |
| Viral Content Scraper | `packages/scrapers/` |
| Meta Ads Intelligence | `packages/scrapers/meta-ads/` |
| Competitor Research | `apps/api/app/services/` + `packages/scrapers/competitors/` |
| Posting Intelligence | `apps/web/src/app/(dashboard)/content-calendar/` |
| Lead Prediction | `apps/api/app/routers/analytics.py` |
| Creative Direction AI | Part of script generation output (structured output field) |
