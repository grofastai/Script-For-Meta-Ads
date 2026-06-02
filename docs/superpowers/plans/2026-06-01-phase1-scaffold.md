# ScriptSite Phase 1: Monorepo Scaffold + Database Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the complete Turborepo monorepo with a running Next.js 14 frontend, Python FastAPI backend, shared TypeScript types, Supabase database schema with RLS, and prompt template structure — so every subsequent phase has a solid, testable foundation.

**Architecture:** Turborepo workspace at `S:\VS CODE USING CODEX\SCRIPTSITE\` manages `apps/web` (Next.js 14 App Router), `apps/api` (FastAPI), and three packages: `shared` (TypeScript types + constants), `db` (Supabase SQL migrations), `ai-engine` (prompt templates). Supabase handles auth + PostgreSQL with row-level security scoped to `org_id` from day one — multi-tenancy correct before any feature is built.

**Tech Stack:** pnpm 9, Turborepo 2, Node.js 20, Next.js 14, Tailwind CSS, ShadCN UI, Python 3.12, FastAPI 0.111, Pydantic v2, Supabase JS v2, Supabase Python v2, pytest, TypeScript 5

---

## File Map

```
scriptsite/
├── package.json                                ← root workspace + turbo scripts
├── pnpm-workspace.yaml                         ← pnpm workspace definition
├── turbo.json                                  ← Turborepo pipeline config
├── .gitignore
├── apps/
│   ├── web/                                    ← Next.js 14 (scaffolded by create-next-app)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx                  ← root layout + fonts
│   │   │   │   ├── page.tsx                    ← redirect to /dashboard or /login
│   │   │   │   ├── (auth)/
│   │   │   │   │   └── login/page.tsx          ← Supabase magic link login
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── layout.tsx              ← auth guard + sidebar shell
│   │   │   │       └── dashboard/page.tsx      ← placeholder dashboard
│   │   │   ├── components/
│   │   │   │   └── ui/                         ← ShadCN components (button, card, input)
│   │   │   └── lib/
│   │   │       ├── supabase/
│   │   │       │   ├── client.ts               ← browser Supabase client
│   │   │       │   └── server.ts               ← server component Supabase client
│   │   │       └── api-client/
│   │   │           └── index.ts                ← typed fetch wrapper for FastAPI
│   │   ├── .env.local.example
│   │   └── package.json
│   └── api/
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py                         ← FastAPI app, CORS, routes mounted
│       │   ├── core/
│       │   │   ├── __init__.py
│       │   │   ├── config.py                   ← env settings via pydantic-settings
│       │   │   ├── database.py                 ← Supabase + Qdrant clients
│       │   │   └── auth.py                     ← JWT dependency (get_current_user)
│       │   ├── routers/
│       │   │   └── __init__.py
│       │   ├── services/
│       │   │   └── __init__.py
│       │   └── models/
│       │       └── __init__.py
│       ├── tests/
│       │   ├── __init__.py
│       │   └── test_health.py                  ← health endpoint test
│       ├── requirements.txt
│       ├── .env.example
│       └── Dockerfile
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── types/
│   │   │   ├── business.ts
│   │   │   ├── script.ts
│   │   │   ├── campaign.ts
│   │   │   └── index.ts                        ← re-exports all types
│   │   └── constants/
│   │       ├── cities.ts
│   │       ├── niches.ts
│   │       ├── hooks.ts
│   │       └── index.ts
│   ├── db/
│   │   ├── package.json
│   │   ├── migrations/
│   │   │   ├── 001_schema.sql                  ← all tables
│   │   │   ├── 002_rls.sql                     ← RLS policies
│   │   │   └── 003_seed.sql                    ← seed hook bank with 20 starter hooks
│   │   └── README.md                           ← how to apply migrations
│   └── ai-engine/
│       ├── package.json
│       └── prompts/
│           ├── audience/
│           │   ├── dharmapuri.txt
│           │   ├── krishnagiri.txt
│           │   ├── salem.txt
│           │   └── chennai.txt
│           ├── hooks/
│           │   ├── optical.txt
│           │   ├── real-estate.txt
│           │   ├── hospital.txt
│           │   └── education.txt
│           └── scripts/
│               ├── lead-script.txt
│               ├── story-script.txt
│               └── offer-script.txt
└── docs/
    └── superpowers/
        ├── specs/2026-06-01-scriptsite-design.md
        └── plans/2026-06-01-phase1-scaffold.md
```

---

## Prerequisites

Before starting, confirm these are installed:
- `node --version` → v20+
- `pnpm --version` → v9+
- `python --version` → 3.12+
- A Supabase account + project created at supabase.com (free tier is fine)
- Have your Supabase project URL and anon key ready from Project Settings → API

---

## Task 1: Initialize Monorepo Root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "scriptsite",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

Save to: `S:\VS CODE USING CODEX\SCRIPTSITE\package.json`

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Save to: `S:\VS CODE USING CODEX\SCRIPTSITE\pnpm-workspace.yaml`

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

Save to: `S:\VS CODE USING CODEX\SCRIPTSITE\turbo.json`

- [ ] **Step 4: Create .gitignore**

```
node_modules
.next
dist
.env
.env.local
__pycache__
*.pyc
.venv
venv
.turbo
```

Save to: `S:\VS CODE USING CODEX\SCRIPTSITE\.gitignore`

- [ ] **Step 5: Install root dependencies**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm install
```

Expected: `node_modules/.modules.yaml` created at root.

- [ ] **Step 6: Commit**

```powershell
git init
git add package.json pnpm-workspace.yaml turbo.json .gitignore
git commit -m "chore: initialize turborepo monorepo root"
```

---

## Task 2: Scaffold Next.js App

**Files:**
- Create: `apps/web/` (via create-next-app)

- [ ] **Step 1: Create apps/ directory and scaffold Next.js**

```powershell
New-Item -ItemType Directory -Force "S:\VS CODE USING CODEX\SCRIPTSITE\apps"
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm dlx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --no-turbopack
```

When prompted for project name, it will use `web` (from the path). Accept all defaults.

Expected: `apps/web/` directory created with Next.js 14 App Router structure.

- [ ] **Step 2: Verify it runs**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm --filter=web dev
```

Open `http://localhost:3000` — should see the default Next.js page.
Stop with Ctrl+C.

- [ ] **Step 3: Update apps/web/package.json to add workspace reference to shared**

Open `apps/web/package.json` and add to `dependencies`:

```json
{
  "dependencies": {
    "@scriptsite/shared": "workspace:*"
  }
}
```

- [ ] **Step 4: Install Supabase JS in web**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm --filter=web add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 5: Commit**

```powershell
git add apps/web
git commit -m "feat: scaffold Next.js 14 app with Tailwind and App Router"
```

---

## Task 3: Install ShadCN UI

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/label.tsx`

- [ ] **Step 1: Initialize ShadCN in the web app**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE\apps\web"
pnpm dlx shadcn@latest init --defaults
```

When prompted:
- Style: Default
- Base color: Zinc
- CSS variables: Yes

- [ ] **Step 2: Add core components**

```powershell
pnpm dlx shadcn@latest add button card input label badge separator
```

Expected: `src/components/ui/` populated with component files.

- [ ] **Step 3: Verify import works — add test to apps/web/src/app/page.tsx**

Replace the contents of `apps/web/src/app/page.tsx` with:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ScriptSite</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Run and verify no TypeScript errors**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm --filter=web dev
```

Open `http://localhost:3000` — should see a card with a button. No console errors.
Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
git add apps/web
git commit -m "feat: install and configure ShadCN UI"
```

---

## Task 4: Create packages/shared

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/types/business.ts`
- Create: `packages/shared/types/script.ts`
- Create: `packages/shared/types/campaign.ts`
- Create: `packages/shared/types/index.ts`
- Create: `packages/shared/constants/cities.ts`
- Create: `packages/shared/constants/niches.ts`
- Create: `packages/shared/constants/hooks.ts`
- Create: `packages/shared/constants/index.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@scriptsite/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./types/index.ts",
  "types": "./types/index.ts",
  "exports": {
    "./types": "./types/index.ts",
    "./constants": "./constants/index.ts"
  }
}
```

Save to: `packages/shared/package.json`

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create packages/shared/types/business.ts**

```typescript
export type NicheCategory =
  | 'optical'
  | 'real-estate'
  | 'hospital'
  | 'education'
  | 'restaurant'
  | 'clothing'
  | 'jewellery'
  | 'pharmacy'
  | 'agency';

export type CityName =
  | 'dharmapuri'
  | 'krishnagiri'
  | 'salem'
  | 'chennai'
  | 'coimbatore'
  | 'hosur'
  | 'karimangalam'
  | 'palacode';

export type CampaignGoal = 'reach' | 'leads' | 'sales' | 'engagement';

export type Language = 'tanglish' | 'english' | 'tamil';

export interface Business {
  id: string;
  org_id: string;
  name: string;
  niche: NicheCategory;
  city: CityName;
  target_audience?: string;
  created_at: string;
}
```

- [ ] **Step 4: Create packages/shared/types/script.ts**

```typescript
import type { NicheCategory, CityName, CampaignGoal, Language } from './business';

export interface ScriptInput {
  business_id: string;
  niche: NicheCategory;
  city: CityName;
  target_audience: string;
  offer: string;
  budget?: number;
  goal: CampaignGoal;
  language: Language;
}

export type HookType = 'curiosity' | 'urgency' | 'local' | 'problem-solution' | 'social-proof';

export interface HookVariant {
  id?: string;
  text: string;
  type: HookType;
  freshness_score: number;
}

export interface ScriptOutput {
  hooks: HookVariant[];
  selected_hook: HookVariant;
  script: string;
  cta: string;
  caption: string;
  hashtags: string[];
  posting_time: string;
  ad_copy: string;
  video_structure: string;
  shot_list: string[];
}
```

- [ ] **Step 5: Create packages/shared/types/campaign.ts**

```typescript
export interface CampaignResult {
  script_id: string;
  business_id: string;
  goal: string;
  reach: number;
  leads: number;
  cost: number;
  cpl?: number;
  notes?: string;
}

export interface PerformanceMetrics {
  total_scripts: number;
  avg_cpl: number;
  best_hook_type: string;
  best_city: string;
  top_performing_scripts: Array<{
    script_id: string;
    leads: number;
    cpl: number;
  }>;
}
```

- [ ] **Step 6: Create packages/shared/types/index.ts**

```typescript
export * from './business';
export * from './script';
export * from './campaign';
```

- [ ] **Step 7: Create packages/shared/constants/cities.ts**

```typescript
export const CITIES = {
  dharmapuri: {
    label: 'Dharmapuri',
    psychology_tags: ['trust', 'family', 'local-language', 'discounts', 'social-proof'],
    language_style: 'tanglish' as const,
    district: 'Dharmapuri',
  },
  krishnagiri: {
    label: 'Krishnagiri',
    psychology_tags: ['value', 'community', 'local-pride', 'word-of-mouth'],
    language_style: 'tanglish' as const,
    district: 'Krishnagiri',
  },
  salem: {
    label: 'Salem',
    psychology_tags: ['trust', 'quality', 'price-conscious', 'family'],
    language_style: 'tanglish' as const,
    district: 'Salem',
  },
  chennai: {
    label: 'Chennai',
    psychology_tags: ['convenience', 'status', 'time-saving', 'quality'],
    language_style: 'english' as const,
    district: 'Chennai',
  },
  coimbatore: {
    label: 'Coimbatore',
    psychology_tags: ['business-minded', 'quality', 'innovation'],
    language_style: 'tanglish' as const,
    district: 'Coimbatore',
  },
  hosur: {
    label: 'Hosur',
    psychology_tags: ['value', 'practical', 'industrial'],
    language_style: 'tanglish' as const,
    district: 'Krishnagiri',
  },
  karimangalam: {
    label: 'Karimangalam',
    psychology_tags: ['local-language', 'community', 'trust', 'family'],
    language_style: 'tanglish' as const,
    district: 'Dharmapuri',
  },
  palacode: {
    label: 'Palacode',
    psychology_tags: ['local-language', 'trust', 'family', 'value'],
    language_style: 'tanglish' as const,
    district: 'Dharmapuri',
  },
} as const;

export type CityKey = keyof typeof CITIES;
export const CITY_OPTIONS = Object.entries(CITIES).map(([value, data]) => ({
  value,
  label: data.label,
}));
```

- [ ] **Step 8: Create packages/shared/constants/niches.ts**

```typescript
export const NICHES = {
  optical: {
    label: 'Optical Store',
    keywords: ['spectacles', 'glasses', 'eye', 'lens', 'vision', 'frame', 'power'],
  },
  'real-estate': {
    label: 'Real Estate',
    keywords: ['property', 'plot', 'house', 'villa', 'apartment', 'land', 'site'],
  },
  hospital: {
    label: 'Hospital / Clinic',
    keywords: ['health', 'doctor', 'treatment', 'medicine', 'care', 'checkup'],
  },
  education: {
    label: 'Education',
    keywords: ['coaching', 'tuition', 'school', 'college', 'training', 'course', 'exam'],
  },
  restaurant: {
    label: 'Restaurant',
    keywords: ['food', 'dining', 'taste', 'menu', 'hotel', 'biryani', 'meals'],
  },
  clothing: {
    label: 'Clothing / Fashion',
    keywords: ['dress', 'fashion', 'clothes', 'saree', 'textile', 'boutique'],
  },
  jewellery: {
    label: 'Jewellery',
    keywords: ['gold', 'silver', 'jewel', 'wedding', 'ring', 'necklace', 'chain'],
  },
  pharmacy: {
    label: 'Pharmacy',
    keywords: ['medicine', 'pharmacy', 'drug', 'health', 'tablet', 'injection'],
  },
  agency: {
    label: 'Marketing Agency',
    keywords: ['marketing', 'ads', 'social media', 'branding', 'digital', 'leads'],
  },
} as const;

export type NicheKey = keyof typeof NICHES;
export const NICHE_OPTIONS = Object.entries(NICHES).map(([value, data]) => ({
  value,
  label: data.label,
}));
```

- [ ] **Step 9: Create packages/shared/constants/hooks.ts**

```typescript
export const HOOK_TYPES = {
  curiosity: {
    label: 'Curiosity',
    description: 'Makes the viewer wonder what happens next',
    examples: ['Nobody tells you this...', 'Most people get this wrong...'],
  },
  urgency: {
    label: 'Urgency',
    description: 'Creates fear of missing out or time pressure',
    examples: ['Only 3 days left...', 'First 50 customers only...'],
  },
  local: {
    label: 'Local Pride',
    description: 'Calls out the viewer by city/area name',
    examples: ['Dharmapuri makkale...', 'Salem la irukeenga-na...'],
  },
  'problem-solution': {
    label: 'Problem-Solution',
    description: 'Identifies a pain point the viewer has',
    examples: ['Unga kannadi power adhigama aagudha?', 'Rent pay pannum pothu...'],
  },
  'social-proof': {
    label: 'Social Proof',
    description: 'Leads with results or customer validation',
    examples: ['500+ customers already...', 'Idha paatha apparam...'],
  },
} as const;

export type HookTypeKey = keyof typeof HOOK_TYPES;
```

- [ ] **Step 10: Create packages/shared/constants/index.ts**

```typescript
export * from './cities';
export * from './niches';
export * from './hooks';
```

- [ ] **Step 11: Install shared package in web app**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm install
```

- [ ] **Step 12: Verify shared types import in web app**

Add a quick import test to `apps/web/src/app/page.tsx` (top of file):

```tsx
import type { ScriptInput } from '@scriptsite/shared/types';
```

Run typecheck:

```powershell
pnpm --filter=web typecheck
```

Expected: No TypeScript errors.

Remove the import after verification (the page.tsx will be rewritten in Task 6).

- [ ] **Step 13: Commit**

```powershell
git add packages/shared
git commit -m "feat: add shared TypeScript types and constants package"
```

---

## Task 5: Create packages/db (Supabase Migrations)

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/migrations/001_schema.sql`
- Create: `packages/db/migrations/002_rls.sql`
- Create: `packages/db/migrations/003_seed.sql`
- Create: `packages/db/README.md`

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@scriptsite/db",
  "version": "0.1.0",
  "private": true,
  "description": "Supabase schema migrations for ScriptSite"
}
```

- [ ] **Step 2: Create packages/db/migrations/001_schema.sql**

```sql
-- Organizations (SaaS multi-tenancy — one org = one agency)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'internal',
  created_at timestamptz not null default now()
);

-- User profiles extending Supabase auth.users
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- Business profiles (clients)
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  niche text not null,
  city text not null,
  target_audience text,
  created_at timestamptz not null default now()
);

-- Hook bank (manual + scraped)
create table if not exists hooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  text text not null,
  language text not null default 'tanglish' check (language in ('tanglish', 'english', 'tamil')),
  niche text not null,
  city text,
  hook_type text check (hook_type in ('curiosity', 'urgency', 'local', 'problem-solution', 'social-proof')),
  source text not null default 'manual' check (source in ('manual', 'scraped', 'generated')),
  views bigint default 0,
  use_count integer default 0,
  saturation_score float default 0 check (saturation_score >= 0 and saturation_score <= 1),
  performance_score float default 0 check (performance_score >= 0 and performance_score <= 1),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Generated scripts (every AI generation stored)
create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  business_id uuid references businesses(id),
  user_id uuid references auth.users(id),
  input_params jsonb not null,
  output jsonb not null,
  hook_id uuid references hooks(id),
  model_used text,
  created_at timestamptz not null default now()
);

-- Campaign performance (logged manually)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  script_id uuid references scripts(id),
  business_id uuid references businesses(id),
  goal text not null check (goal in ('reach', 'leads', 'sales', 'engagement')),
  reach bigint default 0,
  leads integer default 0,
  cost numeric(10,2) default 0,
  cpl numeric(10,2),
  notes text,
  created_at timestamptz not null default now()
);

-- Raw scraped content (before processing into hooks)
create table if not exists scraped_content (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'facebook', 'youtube', 'tiktok')),
  url text,
  hook_text text not null,
  views bigint default 0,
  likes bigint default 0,
  shares bigint default 0,
  niche_tag text,
  processed boolean default false,
  scraped_at timestamptz not null default now()
);

-- Meta ads intelligence
create table if not exists meta_ads (
  id uuid primary key default gen_random_uuid(),
  advertiser text,
  niche text,
  city text,
  offer_type text,
  days_active integer default 0,
  creative_type text,
  first_seen date,
  last_seen date,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Create packages/db/migrations/002_rls.sql**

```sql
-- Enable RLS on all tenant-scoped tables
alter table businesses enable row level security;
alter table hooks enable row level security;
alter table scripts enable row level security;
alter table campaigns enable row level security;

-- Helper: get org_id for the currently authenticated user
create or replace function get_user_org_id()
returns uuid
language sql
security definer
as $$
  select org_id from user_profiles where id = auth.uid();
$$;

-- Businesses: users see only their org
create policy "org_isolation_businesses"
  on businesses for all
  using (org_id = get_user_org_id());

-- Hooks: users see only their org
create policy "org_isolation_hooks"
  on hooks for all
  using (org_id = get_user_org_id());

-- Scripts: users see only their org
create policy "org_isolation_scripts"
  on scripts for all
  using (org_id = get_user_org_id());

-- Campaigns: users see only their org
create policy "org_isolation_campaigns"
  on campaigns for all
  using (org_id = get_user_org_id());

-- scraped_content and meta_ads are global (no org scope — shared intelligence)
-- No RLS needed on these tables
```

- [ ] **Step 4: Create packages/db/migrations/003_seed.sql**

```sql
-- Seed: one default organization for Grofast internal use
insert into organizations (id, name, plan)
values ('00000000-0000-0000-0000-000000000001', 'Grofast', 'internal')
on conflict do nothing;

-- Seed: 20 starter hooks in the hook bank (optical niche, Dharmapuri + Salem)
insert into hooks (org_id, text, language, niche, city, hook_type, source, views, performance_score)
values
  ('00000000-0000-0000-0000-000000000001', 'Dharmapuri la innum neraya per indha mistake pannitu irukanga...', 'tanglish', 'optical', 'dharmapuri', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Unga kannadi power adhigama aagudhu-na idhu dhaan reason.', 'tanglish', 'optical', 'dharmapuri', 'problem-solution', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', '10 seconds kudunga... unga kannukku mukkiyamaana vishayam.', 'tanglish', 'optical', 'dharmapuri', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Salem la oru optical store idha panna simpleaa maruthutanga...', 'tanglish', 'optical', 'salem', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Free eye checkup - intha week mattum Salem la.', 'tanglish', 'optical', 'salem', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Krishnagiri makkale - unga kannadi quality-a check panneenga-a?', 'tanglish', 'optical', 'krishnagiri', 'local', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Specs vaangum pothu ivvlo important - aaana யாரும் sollamaatanga.', 'tanglish', 'optical', null, 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'First 50 customers free frame - today only.', 'tanglish', 'optical', null, 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', '500+ customers already changed their specs here - unga turn?', 'tanglish', 'optical', 'dharmapuri', 'social-proof', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Headache varudha? Screen paakireenga-a? Idhu reason.', 'tanglish', 'optical', null, 'problem-solution', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Dharmapuri la best optical store - customers solranga.', 'tanglish', 'optical', 'dharmapuri', 'social-proof', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Plot vaanganum-na Salem la oru vishayam theriyanum.', 'tanglish', 'real-estate', 'salem', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Krishnagiri la site vaanganum-na idha paaru - 2026 price list.', 'tanglish', 'real-estate', 'krishnagiri', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Hosur SIPCOT pakkam 3 cents - last 2 sites.', 'tanglish', 'real-estate', 'hosur', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Dharmapuri la free consultation - doctor available today.', 'tanglish', 'hospital', 'dharmapuri', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Salem la best coaching center - result paaru.', 'tanglish', 'education', 'salem', 'social-proof', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'NEET la 600+ mark vaanganum-na indha one thing panna podum.', 'tanglish', 'education', null, 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Karimangalam makkale - indha offer 48 hours mattum.', 'tanglish', 'optical', 'karimangalam', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Unga area la ippo trending - paaru.', 'tanglish', 'optical', null, 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Anniversary special - buy frame + lens save Rs.2000.', 'tanglish', 'optical', null, 'urgency', 'manual', 0, 0)
on conflict do nothing;
```

- [ ] **Step 5: Create packages/db/README.md**

```markdown
# Database Migrations

## How to apply

1. Go to your Supabase project: https://supabase.com/dashboard
2. Open SQL Editor
3. Run each migration file in order:
   - 001_schema.sql — creates all tables
   - 002_rls.sql — enables Row Level Security
   - 003_seed.sql — seeds starter data (Grofast org + 20 hooks)

## After applying migrations

Copy your Supabase project URL and anon key from:
Project Settings → API → Project URL + anon public key

Add them to:
- apps/web/.env.local
- apps/api/.env
```

- [ ] **Step 6: Apply migrations in Supabase**

1. Open your Supabase project SQL editor
2. Paste and run `001_schema.sql` — expect: "Success. No rows returned"
3. Paste and run `002_rls.sql` — expect: "Success. No rows returned"
4. Paste and run `003_seed.sql` — expect: "Success. No rows returned"
5. Verify in Table Editor: `organizations`, `hooks`, `businesses`, `scripts`, `campaigns` tables exist

- [ ] **Step 7: Commit**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
git add packages/db
git commit -m "feat: add Supabase schema migrations and seed data"
```

---

## Task 6: Create packages/ai-engine (Prompt Templates)

**Files:**
- Create: `packages/ai-engine/package.json`
- Create: `packages/ai-engine/prompts/audience/dharmapuri.txt`
- Create: `packages/ai-engine/prompts/audience/krishnagiri.txt`
- Create: `packages/ai-engine/prompts/audience/salem.txt`
- Create: `packages/ai-engine/prompts/audience/chennai.txt`
- Create: `packages/ai-engine/prompts/hooks/optical.txt`
- Create: `packages/ai-engine/prompts/hooks/real-estate.txt`
- Create: `packages/ai-engine/prompts/hooks/hospital.txt`
- Create: `packages/ai-engine/prompts/hooks/education.txt`
- Create: `packages/ai-engine/prompts/scripts/lead-script.txt`
- Create: `packages/ai-engine/prompts/scripts/story-script.txt`
- Create: `packages/ai-engine/prompts/scripts/offer-script.txt`

- [ ] **Step 1: Create packages/ai-engine/package.json**

```json
{
  "name": "@scriptsite/ai-engine",
  "version": "0.1.0",
  "private": true,
  "description": "Prompt templates and AI routing configuration for ScriptSite"
}
```

- [ ] **Step 2: Create audience psychology profiles**

Create `packages/ai-engine/prompts/audience/dharmapuri.txt`:

```
AUDIENCE PSYCHOLOGY: DHARMAPURI

Location: Dharmapuri district, Tamil Nadu — Tier 3 city
Language: Tanglish (Tamil written in Roman script, mix of Tamil and English words)
Dialect: Dharmapuri-specific Tamil — slightly different from Salem or Chennai Tamil

PSYCHOLOGY PROFILE:
- Trust is the #1 buying signal. They buy from people/brands they personally know or have heard of from someone they trust.
- Family-oriented decisions: most purchases involve the whole family (especially healthcare, optical, education, gold).
- Price-conscious but not cheap. They want VALUE — if something costs more but is genuinely better, they will pay.
- Strong local pride. Using the word "Dharmapuri" in a hook instantly grabs attention.
- Social proof matters enormously: "500 families already used this" works better than "50% discount".
- Skeptical of big corporate brands. Local, personal, human tone wins.
- Festival timing is critical: Pongal, Diwali, local temple festivals = peak conversion windows.

LANGUAGE RULES:
- Write hooks in Tanglish. Example: "Dharmapuri la innum neraya per indha mistake pannitu irukanga..."
- Use "makkale" (people/folks) to address audience directly.
- Avoid pure English hooks — they feel distant and corporate.
- Include the city name when possible. "Dharmapuri la..." outperforms generic hooks by 3x in this market.
- Common phrases: "ippo", "intha", "indha", "paaru", "theriyuma", "solluven", "panreenga"

OFFER PSYCHOLOGY:
- "Free" works extremely well (free checkup, free consultation, free demo)
- Anniversary / festival offers resonate more than "sale"
- Limited quantity works better than limited time ("first 50 customers" > "today only")
- Installment / EMI offers are very effective for high-ticket items

CONTENT STYLE:
- Personal and direct. Founder-led content performs best.
- Customer testimonials (real people, local faces) outperform polished studio ads.
- Show the problem first, then the solution. Don't lead with the offer.
```

Create `packages/ai-engine/prompts/audience/krishnagiri.txt`:

```
AUDIENCE PSYCHOLOGY: KRISHNAGIRI

Location: Krishnagiri district, Tamil Nadu — Tier 3 city, border district (Karnataka influence)
Language: Tanglish with slight Karnataka influence in some areas (Hosur, Denkanikottai)
Sub-areas: Hosur (industrial, IT-adjacent workers), Krishnagiri town (agricultural traders), Denkanikottai (mango region)

PSYCHOLOGY PROFILE:
- Community-driven. Word-of-mouth is the most powerful channel here.
- Hosur sub-area: slightly more urban, exposed to Bangalore culture. More receptive to convenience and speed.
- Krishnagiri town: traditional values, trust-based buying, agricultural income cycles.
- Value for money is paramount. They compare before buying.
- Local landmark references work well: "Krishnagiri fort pakkam...", "SIPCOT area la..."

LANGUAGE RULES:
- Tanglish is standard. Hosur audiences accept more English than Krishnagiri town.
- "Krishnagiri makkale" is a strong opener.
- Keep sentences short. Rural audiences disengage with long hooks.

OFFER PSYCHOLOGY:
- Agricultural income is seasonal. Timing offers around harvest season (Nov-Jan) for high-ticket items.
- Hosur industrial workers have monthly salary cycles — offer posts work well around 1st-7th of month.
- Group/family offers work well.
```

Create `packages/ai-engine/prompts/audience/salem.txt`:

```
AUDIENCE PSYCHOLOGY: SALEM

Location: Salem district, Tamil Nadu — Tier 2 city, steel city
Language: Tanglish, slightly more formal than Dharmapuri/Krishnagiri
Sub-areas: Salem city (urban, educated), Omalur, Mettur, Yercaud (semi-urban/rural)

PSYCHOLOGY PROFILE:
- More aspirational than smaller districts. Salem audience wants to be seen as urban and progressive.
- Quality matters here more than pure price. "Best quality" hooks work.
- Business community is strong — B2B and commercial offers resonate.
- Slightly higher English tolerance in hooks compared to smaller districts.
- Still family-oriented but more individualistic than rural districts.
- Education is a high-priority purchase — parents invest heavily in children's education.

LANGUAGE RULES:
- Tanglish works well. Can use slightly more English words than Dharmapuri.
- "Salem la" opener is strong.
- Professional tone slightly more acceptable. Can use words like "professional", "quality", "service".

OFFER PSYCHOLOGY:
- "Best in Salem" framing works well — local market leadership matters.
- Anniversary and Diwali offers are major.
- Referral-based offers (bring a friend) work well given strong social networks.
- EMI for premium products is standard expectation.
```

Create `packages/ai-engine/prompts/audience/chennai.txt`:

```
AUDIENCE PSYCHOLOGY: CHENNAI

Location: Chennai, Tamil Nadu — Metro city, capital
Language: Can use more English. Tanglish still preferred for broad reach.
Sub-areas: North Chennai (working class), South Chennai (affluent), suburbs (middle class IT workers)

PSYCHOLOGY PROFILE:
- Convenience is the #1 priority. "Near you", "quick", "same day", "home delivery" all work.
- Status-conscious, especially South Chennai. "Premium", "exclusive", "trusted by professionals" works.
- Time is scarce. Shorter hooks, faster CTAs.
- More skeptical of marketing claims than smaller cities — social proof (Google reviews, before/after) matters.
- Exposed to heavy marketing. Hooks need to be genuinely creative to stop the scroll.

LANGUAGE RULES:
- English-first hooks are acceptable in Chennai. Tanglish for broader reach.
- Can reference Chennai-specific landmarks, areas: "Anna Nagar", "OMR", "T Nagar"
- Avoid over-traditional language — can feel out of place.

OFFER PSYCHOLOGY:
- Convenience-based offers: home delivery, doorstep service, same day.
- Online booking with discount.
- Corporate tie-ups and bulk offers for B2B.
- Free trial periods work for service businesses.
```

- [ ] **Step 3: Create hook prompt templates by niche**

Create `packages/ai-engine/prompts/hooks/optical.txt`:

```
HOOK GENERATION: OPTICAL STORE

CONTEXT VARIABLES (will be injected at runtime):
- {{city}}: the target city
- {{offer}}: the current offer/promotion
- {{audience}}: the target audience segment
- {{few_shot_examples}}: top 3-5 performing hooks from the database (injected automatically)

INSTRUCTIONS:
Generate 3 hook variants for an optical store in {{city}}. The hooks should be in Tanglish unless the city is Chennai (use English-first for Chennai).

Each hook must be under 15 words. Hooks are the FIRST LINE of a social media reel — they must stop the scroll in 2 seconds.

Use ONE of these hook types per variant:
1. Curiosity (make them wonder what's next)
2. Urgency (time/quantity limit)
3. Local (call out the city by name)
4. Problem-Solution (name their eye pain point)
5. Social Proof (results, customer numbers)

OFFER: {{offer}}
CITY: {{city}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS FROM THIS NICHE+CITY (use as style reference, do NOT copy):
{{few_shot_examples}}

AUDIENCE PSYCHOLOGY FOR THIS CITY:
{{city_psychology}}

OUTPUT FORMAT (JSON):
{
  "hooks": [
    {"text": "...", "type": "curiosity"},
    {"text": "...", "type": "urgency"},
    {"text": "...", "type": "local"}
  ]
}
```

Create `packages/ai-engine/prompts/hooks/real-estate.txt`:

```
HOOK GENERATION: REAL ESTATE

CONTEXT VARIABLES:
- {{city}}: target city
- {{offer}}: plot/property type and price range
- {{audience}}: buyer type (first-time buyer, investor, NRI)
- {{few_shot_examples}}: top performing hooks from database
- {{city_psychology}}: city psychology profile

INSTRUCTIONS:
Generate 3 hook variants for a real estate business in {{city}}.

Real estate hooks must create URGENCY around scarcity (limited plots) or OPPORTUNITY (price appreciation). Generic "invest in property" hooks don't work — be specific to the area.

CITY: {{city}}
OFFER: {{offer}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS:
{{few_shot_examples}}

CITY PSYCHOLOGY:
{{city_psychology}}

OUTPUT FORMAT (JSON):
{
  "hooks": [
    {"text": "...", "type": "urgency"},
    {"text": "...", "type": "curiosity"},
    {"text": "...", "type": "local"}
  ]
}
```

Create `packages/ai-engine/prompts/hooks/hospital.txt`:

```
HOOK GENERATION: HOSPITAL / CLINIC

CONTEXT VARIABLES:
- {{city}}, {{offer}}, {{audience}}, {{few_shot_examples}}, {{city_psychology}}

INSTRUCTIONS:
Generate 3 hook variants for a hospital or clinic in {{city}}.

IMPORTANT: Do NOT make medical claims or guarantee cures. Hooks should create awareness of a health concern or promote accessibility of care (free checkup, availability, convenience).

Focus on: prevention, free consultations, availability, trust signals (years of experience, number of patients treated, doctor name).

CITY: {{city}}
OFFER: {{offer}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS:
{{few_shot_examples}}

CITY PSYCHOLOGY:
{{city_psychology}}

OUTPUT FORMAT (JSON):
{
  "hooks": [
    {"text": "...", "type": "problem-solution"},
    {"text": "...", "type": "urgency"},
    {"text": "...", "type": "social-proof"}
  ]
}
```

Create `packages/ai-engine/prompts/hooks/education.txt`:

```
HOOK GENERATION: EDUCATION / COACHING

CONTEXT VARIABLES:
- {{city}}, {{offer}}, {{audience}}, {{few_shot_examples}}, {{city_psychology}}

INSTRUCTIONS:
Generate 3 hook variants for an education or coaching center in {{city}}.

Education hooks should address PARENT anxiety (results, board exams, competitive exams) or STUDENT aspiration (career, scoring high, getting into top colleges).

Exam-specific hooks outperform generic "best coaching" hooks. Use specific exams: NEET, JEE, TNPSC, 10th board, 12th board.

CITY: {{city}}
OFFER: {{offer}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS:
{{few_shot_examples}}

CITY PSYCHOLOGY:
{{city_psychology}}

OUTPUT FORMAT (JSON):
{
  "hooks": [
    {"text": "...", "type": "problem-solution"},
    {"text": "...", "type": "curiosity"},
    {"text": "...", "type": "social-proof"}
  ]
}
```

- [ ] **Step 4: Create script prompt templates**

Create `packages/ai-engine/prompts/scripts/lead-script.txt`:

```
SCRIPT GENERATION: LEAD GENERATION SCRIPT

GOAL: Collect leads (name, phone number, WhatsApp opt-in)

CONTEXT:
- Hook: {{hook}}
- Business: {{business_name}} ({{niche}}) in {{city}}
- Offer: {{offer}}
- Target Audience: {{target_audience}}
- City Psychology: {{city_psychology}}
- Language: {{language}}

SCRIPT STRUCTURE (60-90 second reel):
1. Hook (0-3 sec): Use the provided hook exactly
2. Problem amplification (3-15 sec): Make the viewer feel their pain point more acutely
3. Solution reveal (15-35 sec): Introduce the business/offer as the solution
4. Social proof (35-50 sec): 1-2 specific proof points (numbers, results, customer name)
5. Offer statement (50-65 sec): State the specific offer clearly
6. CTA (65-75 sec): One clear action — "Call us", "DM us", "Click the link"
7. Urgency close (75-85 sec): Why act now (limited time/quantity/spots)

OUTPUT FORMAT (JSON):
{
  "script": "Full script with time markers...",
  "cta": "The specific call-to-action line",
  "caption": "Instagram/Facebook caption (150-200 words)",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "posting_time": "Best day and time to post for this niche+city",
  "ad_copy": "Meta Ads primary text (for boosting the reel)",
  "video_structure": "Shot-by-shot description for the videographer",
  "shot_list": ["Shot 1: ...", "Shot 2: ...", "Shot 3: ..."]
}
```

Create `packages/ai-engine/prompts/scripts/story-script.txt`:

```
SCRIPT GENERATION: STORY / NARRATIVE SCRIPT

GOAL: Brand awareness, trust building, emotional connection

CONTEXT:
- Hook: {{hook}}
- Business: {{business_name}} ({{niche}}) in {{city}}
- Story angle: {{offer}}
- Target Audience: {{target_audience}}
- City Psychology: {{city_psychology}}
- Language: {{language}}

SCRIPT STRUCTURE (60-90 second reel):
1. Hook (0-3 sec): Use the provided hook
2. Story setup (3-20 sec): Introduce a relatable character/situation (customer or founder)
3. Conflict/Problem (20-35 sec): The challenge they faced
4. Turning point (35-50 sec): How the business solved it
5. Resolution (50-65 sec): The happy outcome with specific result
6. Bridge to viewer (65-75 sec): "Unga situation also idhe mathiri-a?"
7. Soft CTA (75-85 sec): Low-friction next step (DM, comment "YES", visit)

OUTPUT FORMAT (JSON):
{
  "script": "Full story script...",
  "cta": "Soft call-to-action",
  "caption": "Story-based caption...",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "posting_time": "Best posting time",
  "ad_copy": "Meta Ads copy for story-based content",
  "video_structure": "Narrative shot structure",
  "shot_list": ["Shot 1: ...", "Shot 2: ..."]
}
```

Create `packages/ai-engine/prompts/scripts/offer-script.txt`:

```
SCRIPT GENERATION: OFFER / PROMOTIONAL SCRIPT

GOAL: Drive immediate action on a specific offer (discount, free service, limited deal)

CONTEXT:
- Hook: {{hook}}
- Business: {{business_name}} ({{niche}}) in {{city}}
- Offer: {{offer}}
- Target Audience: {{target_audience}}
- City Psychology: {{city_psychology}}
- Language: {{language}}

SCRIPT STRUCTURE (30-60 second reel — shorter is better for offers):
1. Hook (0-3 sec): Use the provided hook
2. Offer reveal (3-10 sec): State the offer clearly and specifically
3. What they get (10-25 sec): List exactly what's included — be specific with numbers/values
4. Who it's for (25-35 sec): Qualify the audience ("if you're in {{city}} and...")
5. How to claim (35-45 sec): Exact steps to redeem (call/DM/visit)
6. Urgency/Scarcity (45-55 sec): Why they must act now
7. Repeat CTA (55-60 sec): Say the action one more time

IMPORTANT: Offer scripts must include the specific offer value. Vague offers ("great discount") must be rejected — always specify the exact rupee amount or percentage.

OUTPUT FORMAT (JSON):
{
  "script": "Full offer script...",
  "cta": "Direct CTA with contact method",
  "caption": "Offer-focused caption with full details...",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "posting_time": "Best time for offer posts in this niche",
  "ad_copy": "Meta Ads copy optimized for conversions",
  "video_structure": "Fast-paced offer video structure",
  "shot_list": ["Shot 1: ...", "Shot 2: ..."]
}
```

- [ ] **Step 5: Commit**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
git add packages/ai-engine
git commit -m "feat: add AI prompt templates for hooks, scripts, and audience psychology"
```

---

## Task 7: Set Up FastAPI App

**Files:**
- Create: `apps/api/app/__init__.py`
- Create: `apps/api/app/main.py`
- Create: `apps/api/app/core/__init__.py`
- Create: `apps/api/app/core/config.py`
- Create: `apps/api/app/core/database.py`
- Create: `apps/api/app/core/auth.py`
- Create: `apps/api/app/routers/__init__.py`
- Create: `apps/api/app/services/__init__.py`
- Create: `apps/api/app/models/__init__.py`
- Create: `apps/api/tests/__init__.py`
- Create: `apps/api/tests/test_health.py`
- Create: `apps/api/requirements.txt`
- Create: `apps/api/.env.example`
- Create: `apps/api/Dockerfile`

- [ ] **Step 1: Create requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.0
pydantic-settings==2.2.0
supabase==2.4.0
qdrant-client==1.9.0
httpx==0.27.0
python-jose[cryptography]==3.3.0
pytest==8.1.0
pytest-asyncio==0.23.0
httpx==0.27.0
```

Save to: `apps/api/requirements.txt`

- [ ] **Step 2: Create apps/api/.env.example**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VERCEL_AI_GATEWAY_URL=https://ai-gateway.vercel.com/v1
VERCEL_AI_GATEWAY_KEY=your-gateway-key
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
APIFY_API_TOKEN=
YOUTUBE_API_KEY=
ALLOWED_ORIGINS=http://localhost:3000
```

- [ ] **Step 3: Create apps/api/app/core/config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    vercel_ai_gateway_url: str
    vercel_ai_gateway_key: str
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    apify_api_token: str = ""
    youtube_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}


settings = Settings()
```

- [ ] **Step 4: Create apps/api/app/core/database.py**

```python
from supabase import create_client, Client
from qdrant_client import QdrantClient
from .config import settings

supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)

qdrant = QdrantClient(
    url=settings.qdrant_url,
    api_key=settings.qdrant_api_key or None
)
```

- [ ] **Step 5: Create apps/api/app/core/auth.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from .database import supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return {"id": response.user.id, "email": response.user.email}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
```

- [ ] **Step 6: Create apps/api/app/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings

app = FastAPI(title="ScriptSite API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 7: Create all __init__.py files**

Create empty `__init__.py` in:
- `apps/api/app/__init__.py`
- `apps/api/app/core/__init__.py`
- `apps/api/app/routers/__init__.py`
- `apps/api/app/services/__init__.py`
- `apps/api/app/models/__init__.py`
- `apps/api/tests/__init__.py`

Each file is empty.

- [ ] **Step 8: Write the health endpoint test**

Create `apps/api/tests/test_health.py`:

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_returns_version():
    response = client.get("/health")
    assert "version" in response.json()
```

- [ ] **Step 9: Set up Python virtual environment and run tests**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE\apps\api"
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your Supabase credentials (required to import config).

```powershell
Copy-Item .env.example .env
```

Edit `apps/api/.env` — add real Supabase URL and service role key.

- [ ] **Step 10: Run tests to verify they pass**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE\apps\api"
.venv\Scripts\Activate.ps1
pytest tests/test_health.py -v
```

Expected output:
```
PASSED tests/test_health.py::test_health_returns_ok
PASSED tests/test_health.py::test_health_returns_version
2 passed
```

- [ ] **Step 11: Verify API runs**

```powershell
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/health` — expect: `{"status":"ok","version":"0.1.0"}`
Open `http://localhost:8000/docs` — expect: Swagger UI with health endpoint.

Stop with Ctrl+C.

- [ ] **Step 12: Create Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 13: Commit**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
git add apps/api
git commit -m "feat: scaffold FastAPI app with health endpoint, auth, and Supabase connection"
```

---

## Task 8: Configure Supabase Clients in Next.js

**Files:**
- Create: `apps/web/.env.local.example`
- Create: `apps/web/src/lib/supabase/client.ts`
- Create: `apps/web/src/lib/supabase/server.ts`
- Create: `apps/web/src/lib/api-client/index.ts`

- [ ] **Step 1: Create apps/web/.env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 2: Copy to .env.local and fill in values**

```powershell
Copy-Item "apps\web\.env.local.example" "apps\web\.env.local"
```

Edit `apps/web/.env.local` — add real Supabase URL and anon key (from Supabase Project Settings → API).

- [ ] **Step 3: Create apps/web/src/lib/supabase/client.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Create apps/web/src/lib/supabase/server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 5: Create apps/web/src/lib/api-client/index.ts**

```typescript
import type { ScriptInput, ScriptOutput } from '@scriptsite/shared/types'

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
      ...fetchOptions.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const apiClient = {
  health: () => apiFetch<{ status: string; version: string }>('/health'),

  generateScript: (input: ScriptInput, token: string) =>
    apiFetch<ScriptOutput>('/generate/script', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),
}
```

- [ ] **Step 6: Commit**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
git add apps/web/src/lib apps/web/.env.local.example
git commit -m "feat: configure Supabase browser/server clients and typed API client"
```

---

## Task 9: Build App Layout and Auth Pages

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Create: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Update apps/web/src/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ScriptSite',
  description: 'AI Viral Script Intelligence Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create apps/web/src/app/page.tsx (redirect root to dashboard)**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
```

- [ ] **Step 3: Create apps/web/src/app/(auth)/login/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">ScriptSite</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-zinc-600">
              Check your email for a login link. You can close this tab.
            </p>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@grofast.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Login Link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Create apps/web/src/components/layout/sidebar.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/generate', label: 'Generate Script' },
  { href: '/hooks', label: 'Hook Bank' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/competitors', label: 'Competitors' },
  { href: '/content-calendar', label: 'Content Calendar' },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <span className="font-bold text-lg">ScriptSite</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 5: Create apps/web/src/app/(dashboard)/layout.tsx**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-zinc-50">{children}</main>
    </div>
  )
}
```

- [ ] **Step 6: Create apps/web/src/app/(dashboard)/dashboard/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-zinc-500 text-sm">Welcome back, {user?.email}</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Scripts Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Hooks in Bank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">20</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run and verify the full app**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm --filter=web dev
```

Test flow:
1. Open `http://localhost:3000` — should redirect to `/login`
2. Enter your email → click Send Login Link
3. Check email → click link → should land on `/dashboard`
4. Verify sidebar shows all nav items
5. Verify dashboard shows 3 stat cards

- [ ] **Step 8: Commit**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
git add apps/web/src
git commit -m "feat: build app layout, auth pages, and dashboard shell"
```

---

## Task 10: Configure Turbo Dev Pipeline and Final Verification

**Files:**
- Modify: `apps/web/package.json` — add dev script
- Modify: `apps/api` — add pnpm-compatible dev script wrapper

- [ ] **Step 1: Add dev script to apps/api that Turbo can call**

Create `apps/api/package.json`:

```json
{
  "name": "@scriptsite/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "uvicorn app.main:app --reload --port 8000",
    "test": "pytest tests/ -v",
    "lint": "echo 'no linter configured yet'"
  }
}
```

Note: For Turbo to run the FastAPI dev script, Python's `.venv` must be activated. On Windows, add this to your shell profile or activate before running `pnpm dev`.

- [ ] **Step 2: Run full monorepo dev (web only for now)**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
pnpm --filter=web dev
```

Open `http://localhost:3000` — confirm login page loads.

- [ ] **Step 3: Run API separately to confirm both work simultaneously**

Open a second terminal:

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE\apps\api"
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` — Swagger UI with health endpoint.

- [ ] **Step 4: Run all tests**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE\apps\api"
.venv\Scripts\Activate.ps1
pytest tests/ -v
```

Expected: 2 tests pass.

- [ ] **Step 5: Final git commit**

```powershell
cd "S:\VS CODE USING CODEX\SCRIPTSITE"
git add .
git commit -m "chore: phase 1 complete — monorepo scaffold, DB schema, auth, and prompt templates"
```

---

## Phase 1 Complete — Verification Checklist

After completing all tasks, confirm:

- [ ] `http://localhost:3000` redirects to `/login`
- [ ] Login with magic link works and lands on `/dashboard`
- [ ] Dashboard shows sidebar with all 7 nav items
- [ ] `http://localhost:8000/health` returns `{"status":"ok","version":"0.1.0"}`
- [ ] `http://localhost:8000/docs` shows Swagger UI
- [ ] 2 pytest tests pass
- [ ] Supabase Table Editor shows: `organizations`, `businesses`, `hooks`, `scripts`, `campaigns` tables
- [ ] `hooks` table has 20 seed rows
- [ ] TypeScript compiles without errors (`pnpm --filter=web typecheck`)
- [ ] `packages/ai-engine/prompts/` has 11 prompt files

---

## Next: Phase 2

Phase 2 plan will cover:
- Script Generator form (`/generate` page) with all inputs
- FastAPI `/generate/script` endpoint
- Vercel AI Gateway integration
- Hook scoring and saturation check
- Displaying the full script output (hooks, script, CTA, caption, shot list)
