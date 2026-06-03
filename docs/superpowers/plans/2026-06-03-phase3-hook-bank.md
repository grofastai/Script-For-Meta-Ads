# Phase 3 — Hook Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Hook Bank — a browsable, filterable library of all hooks in the database, with the ability to add hooks manually.

**Architecture:** Backend adds `GET /hooks` and `POST /hooks` endpoints scoped to `org_id`. Frontend adds a `HookBank` Client Component with filter dropdowns and a hook list showing saturation, performance, and type. The shared `Hook` type bridges both.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, Supabase Python client, Next.js 14 App Router, Tailwind CSS, ShadCN Badge/Card/Button/Input

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/app/models/hook.py` | Create | Pydantic models: HookItem, HookCreate |
| `apps/api/app/routers/hooks.py` | Create | GET /hooks and POST /hooks endpoints |
| `apps/api/app/main.py` | Modify | Register hooks router |
| `packages/shared/types/hook.ts` | Create | Shared Hook TypeScript type |
| `packages/shared/types/index.ts` | Modify | Export Hook type |
| `apps/web/src/lib/api-client/index.ts` | Modify | Add getHooks() and addHook() |
| `apps/web/src/components/hooks/HookBank.tsx` | Create | Filter UI + hook list Client Component |
| `apps/web/src/app/(dashboard)/hooks/page.tsx` | Create | Dashboard page that renders HookBank |

---

### Task 1: Backend hook models

**Files:**
- Create: `apps/api/app/models/hook.py`

- [ ] **Step 1: Create hook.py**

```python
from pydantic import BaseModel
from typing import Optional


class HookItem(BaseModel):
    id: str
    text: str
    language: str
    niche: str
    city: Optional[str] = None
    hook_type: Optional[str] = None
    source: str
    use_count: int
    saturation_score: float
    performance_score: float
    last_used_at: Optional[str] = None
    created_at: str


class HookCreate(BaseModel):
    text: str
    language: str = "tanglish"
    niche: str
    city: Optional[str] = None
    hook_type: Optional[str] = None
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/models/hook.py
git commit -m "feat: add HookItem and HookCreate Pydantic models"
```

---

### Task 2: Backend hooks router + register in main

**Files:**
- Create: `apps/api/app/routers/hooks.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Create hooks.py router**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from ..models.hook import HookItem, HookCreate
from ..core.auth import get_current_user
from ..core.database import get_supabase

router = APIRouter(prefix="/hooks", tags=["hooks"])


@router.get("", response_model=list[HookItem])
async def list_hooks(
    niche: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    hook_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
) -> list[HookItem]:
    org_id = user.get("org_id")
    if not org_id:
        return []
    try:
        supabase = get_supabase()
        query = (
            supabase.table("hooks")
            .select(
                "id, text, language, niche, city, hook_type, source, "
                "use_count, saturation_score, performance_score, last_used_at, created_at"
            )
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if niche:
            query = query.eq("niche", niche)
        if city:
            query = query.eq("city", city)
        if hook_type:
            query = query.eq("hook_type", hook_type)
        response = query.execute()
        return [HookItem(**row) for row in (response.data or [])]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("", response_model=HookItem, status_code=201)
async def create_hook(
    body: HookCreate,
    user: dict = Depends(get_current_user),
) -> HookItem:
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organisation")
    try:
        supabase = get_supabase()
        response = supabase.table("hooks").insert({
            "org_id": org_id,
            "text": body.text,
            "language": body.language,
            "niche": body.niche,
            "city": body.city,
            "hook_type": body.hook_type,
            "source": "manual",
            "use_count": 0,
            "saturation_score": 0.0,
            "performance_score": 0.0,
        }).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        return HookItem(**response.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

- [ ] **Step 2: Register hooks router in main.py**

Replace `apps/api/app/main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .routers.generate import router as generate_router
from .routers.hooks import router as hooks_router

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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/routers/hooks.py apps/api/app/main.py
git commit -m "feat: add GET /hooks and POST /hooks endpoints, register hooks router"
```

---

### Task 3: Shared Hook TypeScript type

**Files:**
- Create: `packages/shared/types/hook.ts`
- Modify: `packages/shared/types/index.ts`

- [ ] **Step 1: Create hook.ts**

```typescript
export interface Hook {
  id: string;
  text: string;
  language: string;
  niche: string;
  city: string | null;
  hook_type: string | null;
  source: 'manual' | 'scraped' | 'generated';
  use_count: number;
  saturation_score: number;
  performance_score: number;
  last_used_at: string | null;
  created_at: string;
}

export interface HookCreateInput {
  text: string;
  language?: string;
  niche: string;
  city?: string;
  hook_type?: string;
}

export type HookType = 'curiosity' | 'urgency' | 'local' | 'problem-solution' | 'social-proof';
```

- [ ] **Step 2: Export from index.ts**

Replace `packages/shared/types/index.ts` with:

```typescript
export * from './business';
export * from './script';
export * from './campaign';
export * from './hook';
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/types/hook.ts packages/shared/types/index.ts
git commit -m "feat: add shared Hook type and HookCreateInput"
```

---

### Task 4: Add getHooks and addHook to API client

**Files:**
- Modify: `apps/web/src/lib/api-client/index.ts`

- [ ] **Step 1: Update api-client/index.ts**

Replace the file with:

```typescript
import type { ScriptInput, ScriptOutput, Hook, HookCreateInput } from '@scriptsite/shared/types'

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
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api-client/index.ts
git commit -m "feat: add getHooks and addHook to API client"
```

---

### Task 5: HookBank component

**Files:**
- Create: `apps/web/src/components/hooks/HookBank.tsx`

The component:
- Fetches hooks on mount and when filters change
- Shows filter dropdowns: niche, city, hook_type
- Shows a collapsible "Add Hook" form
- Renders each hook as a row with: text, type badge, niche/city, freshness indicator, performance score, source, use count

Freshness = `1 - saturation_score`. Color: green (≥0.7), yellow (0.3–0.7), red (<0.3).

- [ ] **Step 1: Create HookBank.tsx**

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
import type { Hook } from '@scriptsite/shared/types'

const NICHES = [
  { value: '', label: 'All niches' },
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

const CITIES = [
  { value: '', label: 'All cities' },
  { value: 'dharmapuri', label: 'Dharmapuri' },
  { value: 'krishnagiri', label: 'Krishnagiri' },
  { value: 'salem', label: 'Salem' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'hosur', label: 'Hosur' },
  { value: 'karimangalam', label: 'Karimangalam' },
  { value: 'palacode', label: 'Palacode' },
]

const HOOK_TYPES = [
  { value: '', label: 'All types' },
  { value: 'curiosity', label: 'Curiosity' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'local', label: 'Local' },
  { value: 'problem-solution', label: 'Problem-Solution' },
  { value: 'social-proof', label: 'Social Proof' },
]

function freshnessColor(saturation: number) {
  const freshness = 1 - saturation
  if (freshness >= 0.7) return 'bg-green-500'
  if (freshness >= 0.3) return 'bg-yellow-400'
  return 'bg-red-500'
}

function freshnessLabel(saturation: number) {
  const freshness = 1 - saturation
  if (freshness >= 0.7) return 'Fresh'
  if (freshness >= 0.3) return 'Moderate'
  return 'Saturated'
}

function hookTypeBadgeVariant(type: string | null): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'urgency': return 'destructive'
    case 'social-proof': return 'default'
    case 'curiosity': return 'secondary'
    default: return 'outline'
  }
}

export function HookBank() {
  const [hooks, setHooks] = useState<Hook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [niche, setNiche] = useState('')
  const [city, setCity] = useState('')
  const [hookType, setHookType] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    text: '',
    niche: 'optical',
    city: '',
    hook_type: '',
    language: 'tanglish',
  })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchHooks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const data = await apiClient.getHooks(
        { niche: niche || undefined, city: city || undefined, hook_type: hookType || undefined },
        session.access_token,
      )
      setHooks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hooks')
    } finally {
      setLoading(false)
    }
  }, [niche, city, hookType])

  useEffect(() => {
    fetchHooks()
  }, [fetchHooks])

  async function handleAddHook(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.text.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      await apiClient.addHook(
        {
          text: addForm.text.trim(),
          niche: addForm.niche,
          city: addForm.city || undefined,
          hook_type: addForm.hook_type || undefined,
          language: addForm.language,
        },
        session.access_token,
      )
      setAddForm({ text: '', niche: 'optical', city: '', hook_type: '', language: 'tanglish' })
      setShowAddForm(false)
      await fetchHooks()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add hook')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Niche</Label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City</Label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={hookType}
                onChange={(e) => setHookType(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {HOOK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm((v) => !v)}
              >
                {showAddForm ? 'Cancel' : '+ Add Hook'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Hook Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Hook Manually</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddHook} className="space-y-3">
              <div className="space-y-1">
                <Label>Hook Text</Label>
                <Input
                  placeholder="e.g. Dharmapuri la innum neraya per indha mistake pannitu irukanga..."
                  value={addForm.text}
                  onChange={(e) => setAddForm((f) => ({ ...f, text: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Niche</Label>
                  <select
                    value={addForm.niche}
                    onChange={(e) => setAddForm((f) => ({ ...f, niche: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    {NICHES.filter((n) => n.value).map((n) => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City (optional)</Label>
                  <select
                    value={addForm.city}
                    onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type (optional)</Label>
                  <select
                    value={addForm.hook_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, hook_type: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    {HOOK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <select
                    value={addForm.language}
                    onChange={(e) => setAddForm((f) => ({ ...f, language: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="tanglish">Tanglish</option>
                    <option value="tamil">Tamil</option>
                    <option value="english">English</option>
                  </select>
                </div>
              </div>
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <Button type="submit" size="sm" disabled={adding}>
                {adding ? 'Adding...' : 'Add Hook'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Hook List */}
      {loading && (
        <div className="text-center py-12 text-zinc-400 text-sm">Loading hooks...</div>
      )}
      {!loading && error && (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      )}
      {!loading && !error && hooks.length === 0 && (
        <div className="text-center py-12 text-zinc-400 text-sm">
          No hooks found. Add one above or generate scripts to populate the bank.
        </div>
      )}
      {!loading && !error && hooks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">{hooks.length} hooks</p>
          {hooks.map((hook) => (
            <Card key={hook.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {/* Freshness dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${freshnessColor(hook.saturation_score)}`}
                      title={freshnessLabel(hook.saturation_score)}
                    />
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{hook.text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {hook.hook_type && (
                        <Badge variant={hookTypeBadgeVariant(hook.hook_type)}>
                          {hook.hook_type}
                        </Badge>
                      )}
                      <Badge variant="outline">{hook.niche}</Badge>
                      {hook.city && <Badge variant="outline">{hook.city}</Badge>}
                      <Badge variant="outline">{hook.source}</Badge>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <p className="text-xs text-zinc-500">
                      Freshness:{' '}
                      <span className="font-medium text-zinc-800">
                        {Math.round((1 - hook.saturation_score) * 100)}%
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Score:{' '}
                      <span className="font-medium text-zinc-800">
                        {Math.round(hook.performance_score * 100)}%
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">Used {hook.use_count}×</p>
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
git add apps/web/src/components/hooks/HookBank.tsx
git commit -m "feat: add HookBank component with filters, hook list, and add-hook form"
```

---

### Task 6: Hooks page

**Files:**
- Create: `apps/web/src/app/(dashboard)/hooks/page.tsx`

- [ ] **Step 1: Create hooks/page.tsx**

```tsx
import { HookBank } from '@/components/hooks/HookBank'

export default function HooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hook Bank</h1>
        <p className="text-zinc-500 text-sm">
          Browse, filter, and add hooks. Freshness indicator shows how often each hook has been used.
        </p>
      </div>
      <HookBank />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(dashboard)/hooks/page.tsx
git commit -m "feat: add /hooks dashboard page"
```

---

## Self-Review

**Spec coverage:**
- ✅ `/hooks` page — Task 6
- ✅ `GET /hooks` API endpoint with niche/city/hook_type filters — Task 2
- ✅ `POST /hooks` to add manually — Task 2
- ✅ `HookBank` component — Task 5
- ✅ Saturation score display (freshness indicator + percentage) — Task 5
- ✅ Filter by niche, city, type — Task 5
- ✅ Sidebar already has `/hooks` link (pre-existing) — no change needed

**Placeholder scan:** No TBDs, no "implement later", complete code in every step. ✅

**Type consistency:**
- `Hook` defined in `packages/shared/types/hook.ts`, imported in `HookBank.tsx` via `@scriptsite/shared/types` ✅
- `HookCreateInput` defined in shared types, used in `apiClient.addHook` ✅
- `HookItem` Pydantic model fields match `Hook` TS type fields exactly ✅
- `apiClient.getHooks(filters, token)` signature matches usage in `HookBank.tsx` ✅
- `apiClient.addHook(input, token)` signature matches usage in `HookBank.tsx` ✅
- `HookFilters` interface exported from `api-client/index.ts` — not imported in `HookBank.tsx` (uses inline object literal — fine) ✅
