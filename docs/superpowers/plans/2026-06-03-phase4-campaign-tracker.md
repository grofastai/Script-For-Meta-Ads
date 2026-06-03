# Phase 4 — Campaign Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Campaign Tracker so agency staff can log actual campaign results (reach, leads, cost) against a generated script, automatically recalculate hook performance scores, and view a performance summary.

**Architecture:** Backend adds `POST /analytics/campaign`, `GET /analytics/campaign/{id}`, and `GET /analytics/campaigns` endpoints. After logging results, the system recalculates the linked hook's `performance_score` using the formula `leads / (reach * 0.01)` capped at 1.0. Frontend adds a `CampaignTracker` Client Component with a log form and campaign list, plus a simple performance summary.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, Supabase Python client, Next.js 14 App Router, Tailwind CSS, ShadCN Card/Button/Input/Label/Badge

---

## Background

### Performance score formula (from CLAUDE.md)
`performance_score = leads / (reach * 0.01)`, capped at 1.0.

### DB tables in play

**campaigns** (`packages/db/migrations/001_schema.sql`):
```sql
campaigns (id, org_id, script_id, business_id, goal, reach, leads, cost, cpl, notes, created_at)
```

**scripts**:
```sql
scripts (id, org_id, business_id, user_id, input_params, output, hook_id, model_used, created_at)
```

**hooks**:
```sql
hooks (id, org_id, ..., performance_score, ...)
```

### Recalculation flow after logging
1. Insert campaign row, auto-compute `cpl = cost / leads` (if leads > 0)
2. Look up `scripts` table via `script_id` → get `hook_id`
3. If `hook_id` found: update `hooks.performance_score = min(leads / (reach * 0.01), 1.0)` for that hook

### Existing shared campaign types (already in `packages/shared/types/campaign.ts`)
```typescript
export interface CampaignResult { ... }   // input shape
export interface PerformanceMetrics { ... } // summary shape
```
These need a `Campaign` entity type added (the DB row returned by the API).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/app/models/campaign.py` | Create | CampaignCreate, CampaignItem Pydantic models |
| `apps/api/app/routers/analytics.py` | Create | POST /analytics/campaign, GET /analytics/campaign/{id}, GET /analytics/campaigns |
| `apps/api/app/main.py` | Modify | Register analytics router |
| `packages/shared/types/campaign.ts` | Modify | Add Campaign entity type |
| `apps/web/src/lib/api-client/index.ts` | Modify | Add logCampaign(), getCampaigns() |
| `apps/web/src/components/campaigns/CampaignTracker.tsx` | Create | Log form + campaign list + performance summary |
| `apps/web/src/app/(dashboard)/campaigns/page.tsx` | Create | Dashboard page |

---

### Task 1: Backend campaign models

**Files:**
- Create: `apps/api/app/models/campaign.py`

- [ ] **Step 1: Create campaign.py**

```python
from pydantic import BaseModel
from typing import Optional


class CampaignCreate(BaseModel):
    script_id: Optional[str] = None
    business_id: Optional[str] = None
    goal: str  # 'reach' | 'leads' | 'sales' | 'engagement'
    reach: int = 0
    leads: int = 0
    cost: float = 0.0
    notes: Optional[str] = None


class CampaignItem(BaseModel):
    id: str
    org_id: str
    script_id: Optional[str] = None
    business_id: Optional[str] = None
    goal: str
    reach: int
    leads: int
    cost: float
    cpl: Optional[float] = None
    notes: Optional[str] = None
    created_at: str
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/models/campaign.py
git commit -m "feat: add CampaignCreate and CampaignItem Pydantic models"
```

---

### Task 2: Backend analytics router + register in main

**Files:**
- Create: `apps/api/app/routers/analytics.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Create analytics.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from ..models.campaign import CampaignCreate, CampaignItem
from ..core.auth import get_current_user
from ..core.database import get_supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _recalculate_hook_score(
    supabase,
    script_id: str,
    leads: int,
    reach: int,
    org_id: str,
) -> None:
    """Update the hook's performance_score after a campaign is logged."""
    if reach <= 0:
        return
    score = min(leads / (reach * 0.01), 1.0)
    script_row = (
        supabase.table("scripts")
        .select("hook_id")
        .eq("id", script_id)
        .eq("org_id", org_id)
        .maybe_single()
        .execute()
    )
    if not script_row.data or not script_row.data.get("hook_id"):
        return
    hook_id = script_row.data["hook_id"]
    supabase.table("hooks").update({"performance_score": score}).eq("id", hook_id).execute()


@router.post("/campaign", response_model=CampaignItem, status_code=201)
async def log_campaign(
    body: CampaignCreate,
    user: dict = Depends(get_current_user),
) -> CampaignItem:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    cpl = round(body.cost / body.leads, 2) if body.leads > 0 else None
    try:
        supabase = get_supabase()
        response = supabase.table("campaigns").insert({
            "org_id": org_id,
            "script_id": body.script_id,
            "business_id": body.business_id,
            "goal": body.goal,
            "reach": body.reach,
            "leads": body.leads,
            "cost": body.cost,
            "cpl": cpl,
            "notes": body.notes,
        }).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        campaign = CampaignItem(**response.data[0])
        if body.script_id:
            try:
                _recalculate_hook_score(supabase, body.script_id, body.leads, body.reach, org_id)
            except Exception:
                pass  # score recalculation failure must not block the response
        return campaign
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/campaign/{campaign_id}", response_model=CampaignItem)
async def get_campaign(
    campaign_id: str,
    user: dict = Depends(get_current_user),
) -> CampaignItem:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    try:
        supabase = get_supabase()
        response = (
            supabase.table("campaigns")
            .select("*")
            .eq("id", campaign_id)
            .eq("org_id", org_id)
            .maybe_single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return CampaignItem(**response.data)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/campaigns", response_model=list[CampaignItem])
async def list_campaigns(
    user: dict = Depends(get_current_user),
) -> list[CampaignItem]:
    org_id = user.get("org_id")
    if not org_id:
        return []
    try:
        supabase = get_supabase()
        response = (
            supabase.table("campaigns")
            .select("*")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [CampaignItem(**row) for row in (response.data or [])]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

- [ ] **Step 2: Register analytics router in main.py**

Replace `apps/api/app/main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .routers.generate import router as generate_router
from .routers.hooks import router as hooks_router
from .routers.analytics import router as analytics_router

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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/routers/analytics.py apps/api/app/main.py
git commit -m "feat: add analytics router (log campaign, get campaign, list campaigns) with hook score recalculation"
```

---

### Task 3: Update shared Campaign types

**Files:**
- Modify: `packages/shared/types/campaign.ts`

- [ ] **Step 1: Replace campaign.ts**

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

export interface Campaign {
  id: string;
  org_id: string;
  script_id: string | null;
  business_id: string | null;
  goal: string;
  reach: number;
  leads: number;
  cost: number;
  cpl: number | null;
  notes: string | null;
  created_at: string;
}

export interface CampaignCreateInput {
  script_id?: string;
  business_id?: string;
  goal: string;
  reach: number;
  leads: number;
  cost: number;
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

- [ ] **Step 2: Commit**

```bash
git add packages/shared/types/campaign.ts
git commit -m "feat: add Campaign entity type and CampaignCreateInput to shared types"
```

---

### Task 4: Add logCampaign and getCampaigns to API client

**Files:**
- Modify: `apps/web/src/lib/api-client/index.ts`

- [ ] **Step 1: Update api-client/index.ts**

Replace the file with:

```typescript
import type { ScriptInput, ScriptOutput, Hook, HookCreateInput, Campaign, CampaignCreateInput } from '@scriptsite/shared/types'

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
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api-client/index.ts
git commit -m "feat: add logCampaign, getCampaigns, getCampaign to API client"
```

---

### Task 5: CampaignTracker component

**Files:**
- Create: `apps/web/src/components/campaigns/CampaignTracker.tsx`

The component shows:
1. A "Log Results" form (script_id, goal, reach, leads, cost, notes)
2. A list of all logged campaigns (goal badge, reach, leads, CPL, date)
3. A simple performance summary at the top: total leads, avg CPL, best campaign

- [ ] **Step 1: Create CampaignTracker.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { Campaign } from '@scriptsite/shared/types'

const GOALS = [
  { value: 'leads', label: 'Lead Generation' },
  { value: 'reach', label: 'Reach / Brand Awareness' },
  { value: 'sales', label: 'Direct Sales' },
  { value: 'engagement', label: 'Engagement' },
]

function goalBadgeVariant(goal: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (goal) {
    case 'leads': return 'default'
    case 'sales': return 'destructive'
    case 'reach': return 'secondary'
    default: return 'outline'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function computeSummary(campaigns: Campaign[]) {
  if (campaigns.length === 0) return null
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
  const withCpl = campaigns.filter((c) => c.cpl !== null && c.cpl > 0)
  const avgCpl = withCpl.length > 0
    ? withCpl.reduce((s, c) => s + (c.cpl ?? 0), 0) / withCpl.length
    : null
  const best = [...campaigns].sort((a, b) => b.leads - a.leads)[0]
  return { totalLeads, avgCpl, best }
}

export function CampaignTracker() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    script_id: '',
    goal: 'leads',
    reach: '',
    leads: '',
    cost: '',
    notes: '',
  })
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState('')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const data = await apiClient.getCampaigns(session.access_token)
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    setLogError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      await apiClient.logCampaign(
        {
          script_id: form.script_id.trim() || undefined,
          goal: form.goal,
          reach: parseInt(form.reach) || 0,
          leads: parseInt(form.leads) || 0,
          cost: parseFloat(form.cost) || 0,
          notes: form.notes.trim() || undefined,
        },
        session.access_token,
      )
      setForm({ script_id: '', goal: 'leads', reach: '', leads: '', cost: '', notes: '' })
      setShowForm(false)
      try {
        await fetchCampaigns()
      } catch {
        // fetchCampaigns sets its own error state
      }
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log campaign')
    } finally {
      setLogging(false)
    }
  }

  const summary = computeSummary(campaigns)

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Avg CPL</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.avgCpl !== null ? `₹${summary.avgCpl.toFixed(0)}` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Best Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.best.leads} leads</p>
              <p className="text-xs text-zinc-400">{summary.best.goal}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowForm((v) => !v); setLogError('') }}
        >
          {showForm ? 'Cancel' : '+ Log Campaign Results'}
        </Button>
      </div>

      {/* Log form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log Campaign Results</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLog} className="space-y-3">
              <div className="space-y-1">
                <Label>Script ID (optional)</Label>
                <Input
                  placeholder="Paste the script_id from the generated script"
                  value={form.script_id}
                  onChange={(e) => setForm((f) => ({ ...f, script_id: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="space-y-1">
                  <Label className="text-xs">Reach</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={form.reach}
                    onChange={(e) => setForm((f) => ({ ...f, reach: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Leads</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    value={form.leads}
                    onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ad Spend (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={form.cost}
                    onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Input
                  placeholder="Any observations about this campaign"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {logError && <p className="text-sm text-red-500">{logError}</p>}
              <Button type="submit" size="sm" disabled={logging}>
                {logging ? 'Logging...' : 'Log Results'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Campaign list */}
      {loading && (
        <div className="text-center py-12 text-zinc-400 text-sm">Loading campaigns...</div>
      )}
      {!loading && error && (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      )}
      {!loading && !error && campaigns.length === 0 && (
        <div className="text-center py-12 text-zinc-400 text-sm">
          No campaigns logged yet. Run an ad using a generated script, then log the results above.
        </div>
      )}
      {!loading && !error && campaigns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">{campaigns.length} campaigns</p>
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={goalBadgeVariant(c.goal)}>{c.goal}</Badge>
                      {c.script_id && (
                        <span className="text-xs text-zinc-400 font-mono truncate max-w-[160px]">
                          script: {c.script_id.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    {c.notes && (
                      <p className="text-sm text-zinc-600">{c.notes}</p>
                    )}
                    <p className="text-xs text-zinc-400">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <p className="text-sm font-semibold">{c.leads} leads</p>
                    <p className="text-xs text-zinc-500">
                      Reach: <span className="text-zinc-800">{c.reach.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      CPL:{' '}
                      <span className="text-zinc-800">
                        {c.cpl !== null ? `₹${c.cpl.toFixed(0)}` : '—'}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Spend:{' '}
                      <span className="text-zinc-800">₹{c.cost.toFixed(0)}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/campaigns/CampaignTracker.tsx
git commit -m "feat: add CampaignTracker component with log form, campaign list, and summary cards"
```

---

### Task 6: Campaigns page

**Files:**
- Create: `apps/web/src/app/(dashboard)/campaigns/page.tsx`

- [ ] **Step 1: Create campaigns/page.tsx**

```tsx
import { CampaignTracker } from '@/components/campaigns/CampaignTracker'

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-zinc-500 text-sm">
          Log actual campaign results to track performance and improve hook scoring.
        </p>
      </div>
      <CampaignTracker />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/campaigns/page.tsx"
git commit -m "feat: add /campaigns dashboard page"
```

---

## Self-Review

**Spec coverage:**
- ✅ `/campaigns` page — Task 6
- ✅ `POST /analytics/campaign` (log results) — Task 2
- ✅ `GET /analytics/campaign/:id` — Task 2
- ✅ `GET /analytics/campaigns` (list) — Task 2
- ✅ Performance score recalculation on log — Task 2 (`_recalculate_hook_score`)
- ✅ `performance_score = leads / (reach * 0.01)`, capped at 1.0 — Task 2
- ✅ `CampaignTracker` component — Task 5
- ✅ Log actual results (leads, CPL) against a generated script — Task 5 form
- ✅ PerformanceChart / performance summary (total leads, avg CPL, best campaign) — Task 5 summary cards
- ✅ CPL auto-calculated as `cost / leads` — Task 2

**Placeholder scan:** No TBDs, no "implement later", complete code in every step. ✅

**Type consistency:**
- `CampaignCreateInput` defined in shared types (Task 3), imported in api-client (Task 4) and used in `CampaignTracker.tsx` (Task 5) ✅
- `Campaign` defined in shared types (Task 3), returned by `apiClient.getCampaigns` / `logCampaign`, used in state in `CampaignTracker.tsx` ✅
- `CampaignItem` Python model fields align with `Campaign` TS type (id, org_id, script_id, business_id, goal, reach, leads, cost, cpl, notes, created_at) ✅
- `apiClient.logCampaign(input, token)` and `apiClient.getCampaigns(token)` match usage in `CampaignTracker.tsx` ✅
- `_recalculate_hook_score` is a private helper (prefixed `_`), only called within analytics.py ✅
