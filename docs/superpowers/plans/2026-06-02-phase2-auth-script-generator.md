# Phase 2: Auth + Script Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Supabase auth end-to-end (magic link → session → protected routes), then build the full Script Generator — form → FastAPI → Vercel AI Gateway → structured output displayed in the UI.

**Architecture:** Next.js middleware refreshes Supabase sessions on every request. A `/auth/callback` route handler exchanges magic-link codes for sessions. The generator is a client component (`GeneratorForm`) that POSTs to FastAPI with the user's JWT. FastAPI's `script_service` assembles prompts from the ai-engine text files, fetches top hooks from Supabase via `hook_service`, sends to Vercel AI Gateway via `ai_service`, and returns a `ScriptResponse`. The frontend renders results in `ScriptOutput`.

**Tech Stack:** Next.js 16.2.6 (App Router), @supabase/ssr 0.10.3, FastAPI 0.115, Pydantic v2, httpx (async), pytest + unittest.mock

> **⚠️ Next.js 16 note:** This project runs Next.js 16.2.6, which may differ from training data. Before writing any Next.js file, check `node_modules/next/dist/docs/` for any relevant breaking changes.

---

## File Map

```
apps/web/src/
├── middleware.ts                              CREATE — session refresh on every request
├── app/
│   ├── auth/callback/route.ts                 CREATE — magic link code exchange
│   ├── (auth)/login/page.tsx                  MODIFY — fix emailRedirectTo URL
│   └── (dashboard)/
│       └── generate/page.tsx                  CREATE — script generator page
├── components/
│   ├── layout/sidebar.tsx                     MODIFY — add sign-out button
│   └── generate/
│       ├── GeneratorForm.tsx                  CREATE — input form (client component)
│       └── ScriptOutput.tsx                   CREATE — results display (client component)

apps/api/app/
├── core/config.py                             MODIFY — add prompt_dir setting
├── models/script.py                           CREATE — Pydantic request/response models
├── services/
│   ├── hook_service.py                        CREATE — fetch top hooks from Supabase
│   ├── ai_service.py                          CREATE — Vercel AI Gateway client
│   └── script_service.py                      CREATE — prompt assembly + orchestration
├── routers/generate.py                        CREATE — POST /generate/script endpoint
└── main.py                                    MODIFY — register generate router

apps/api/tests/
├── test_hook_service.py                       CREATE
├── test_ai_service.py                         CREATE
├── test_script_service.py                     CREATE
└── test_generate_router.py                    CREATE
```

---

## Task 1: Auth — Middleware + Callback Route

**Files:**
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/src/app/auth/callback/route.ts`
- Modify: `apps/web/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create middleware**

Create `apps/web/src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Create auth callback route**

Create `apps/web/src/app/auth/callback/route.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

- [ ] **Step 3: Fix login page redirect URL**

In `apps/web/src/app/(auth)/login/page.tsx`, change the `emailRedirectTo` from `/dashboard` to `/auth/callback`:

```typescript
// Change this line inside handleLogin:
options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/app/auth/callback/route.ts apps/web/src/app/(auth)/login/page.tsx
git commit -m "feat: wire auth middleware and magic link callback"
```

---

## Task 2: Auth — Sign Out

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add sign-out button to sidebar**

Replace the contents of `apps/web/src/components/layout/sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      <div className="p-2 border-t">
        <button
          onClick={handleSignOut}
          className="w-full px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 text-left transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: add sign-out button to sidebar"
```

---

## Task 3: Backend — Config + Pydantic Models

**Files:**
- Modify: `apps/api/app/core/config.py`
- Create: `apps/api/app/models/script.py`

- [ ] **Step 1: Add prompt_dir to config**

Replace `apps/api/app/core/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_service_role_key: str = "placeholder-key"
    vercel_ai_gateway_url: str = "https://ai-gateway.vercel.com/v1"
    vercel_ai_gateway_key: str = "placeholder-key"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    apify_api_token: str = ""
    youtube_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"
    prompt_dir: str = "../../packages/ai-engine/prompts"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

- [ ] **Step 2: Create Pydantic models**

Create `apps/api/app/models/script.py`:

```python
from pydantic import BaseModel
from typing import Optional


class ScriptRequest(BaseModel):
    niche: str
    city: str
    target_audience: str
    offer: str
    goal: str  # 'reach' | 'leads' | 'sales' | 'engagement'
    language: str  # 'tanglish' | 'english' | 'tamil'
    budget: Optional[float] = None
    business_name: Optional[str] = None


class HookVariant(BaseModel):
    text: str
    type: str  # 'curiosity' | 'urgency' | 'local' | 'problem-solution' | 'social-proof'
    freshness_score: float


class ScriptResponse(BaseModel):
    hooks: list[HookVariant]
    selected_hook: HookVariant
    script: str
    cta: str
    caption: str
    hashtags: list[str]
    posting_time: str
    ad_copy: str
    video_structure: str
    shot_list: list[str]
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/core/config.py apps/api/app/models/script.py
git commit -m "feat: add prompt_dir config and script Pydantic models"
```

---

## Task 4: Backend — Hook Service

**Files:**
- Create: `apps/api/app/services/hook_service.py`
- Create: `apps/api/tests/test_hook_service.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/test_hook_service.py`:

```python
from unittest.mock import MagicMock, patch
import pytest
from app.services.hook_service import get_top_hooks


@pytest.mark.asyncio
async def test_get_top_hooks_returns_hooks():
    mock_response = MagicMock()
    mock_response.data = [
        {
            "text": "Dharmapuri la neraya per paakum...",
            "hook_type": "local",
            "performance_score": 0.9,
            "saturation_score": 0.1,
        }
    ]
    mock_supabase = MagicMock()
    (
        mock_supabase.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .gte.return_value
        .order.return_value
        .limit.return_value
        .execute.return_value
    ) = mock_response

    with patch("app.services.hook_service.get_supabase", return_value=mock_supabase):
        hooks = await get_top_hooks("optical", "dharmapuri")

    assert len(hooks) == 1
    assert hooks[0]["text"] == "Dharmapuri la neraya per paakum..."


@pytest.mark.asyncio
async def test_get_top_hooks_returns_empty_when_none():
    mock_response = MagicMock()
    mock_response.data = []
    mock_supabase = MagicMock()
    (
        mock_supabase.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .gte.return_value
        .order.return_value
        .limit.return_value
        .execute.return_value
    ) = mock_response

    with patch("app.services.hook_service.get_supabase", return_value=mock_supabase):
        hooks = await get_top_hooks("optical", "dharmapuri")

    assert hooks == []
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/test_hook_service.py -v
```
Expected: `ModuleNotFoundError` or `ImportError` — `hook_service` doesn't exist yet.

- [ ] **Step 3: Implement hook service**

Create `apps/api/app/services/hook_service.py`:

```python
from ..core.database import get_supabase


async def get_top_hooks(niche: str, city: str, limit: int = 5) -> list[dict]:
    supabase = get_supabase()
    response = (
        supabase.table("hooks")
        .select("text, hook_type, performance_score, saturation_score")
        .eq("niche", niche)
        .eq("city", city)
        .gte("performance_score", 0.0)
        .order("performance_score", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/test_hook_service.py -v
```
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/hook_service.py apps/api/tests/test_hook_service.py
git commit -m "feat: add hook service with Supabase query"
```

---

## Task 5: Backend — AI Service

**Files:**
- Create: `apps/api/app/services/ai_service.py`
- Create: `apps/api/tests/test_ai_service.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/test_ai_service.py`:

```python
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_service import generate


@pytest.mark.asyncio
async def test_generate_returns_parsed_json():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": json.dumps({"hooks": []})}}]
    }
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)

    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ai_service.httpx.AsyncClient", return_value=mock_async_client):
        result = await generate("test prompt", "hooks")

    assert result == {"hooks": []}


@pytest.mark.asyncio
async def test_generate_uses_gpt4o_for_hooks():
    captured = {}

    async def mock_post(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": '{"hooks": []}'}}]
        }
        mock_resp.raise_for_status = MagicMock()
        return mock_resp

    mock_client_instance = AsyncMock()
    mock_client_instance.post = mock_post

    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ai_service.httpx.AsyncClient", return_value=mock_async_client):
        await generate("test prompt", "hooks")

    assert captured.get("model") == "gpt-4o"


@pytest.mark.asyncio
async def test_generate_uses_claude_for_lead_script():
    captured = {}

    async def mock_post(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": '{"script": ""}'}}]
        }
        mock_resp.raise_for_status = MagicMock()
        return mock_resp

    mock_client_instance = AsyncMock()
    mock_client_instance.post = mock_post

    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ai_service.httpx.AsyncClient", return_value=mock_async_client):
        await generate("test prompt", "lead-script")

    assert captured.get("model") == "claude-sonnet-4-5"
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/test_ai_service.py -v
```
Expected: `ImportError`

- [ ] **Step 3: Implement AI service**

Create `apps/api/app/services/ai_service.py`:

```python
import json
import httpx
from ..core.config import settings

_MODEL_MAP = {
    "hooks": "gpt-4o",
    "lead-script": "claude-sonnet-4-5",
    "story-script": "claude-sonnet-4-5",
    "offer-script": "gpt-4o",
}


async def generate(prompt: str, task: str) -> dict:
    model = _MODEL_MAP.get(task, "gpt-4o")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.vercel_ai_gateway_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.vercel_ai_gateway_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a viral marketing script writer for Tamil Nadu businesses. "
                            "Always respond with valid JSON matching the requested output format exactly."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.8,
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/test_ai_service.py -v
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/ai_service.py apps/api/tests/test_ai_service.py
git commit -m "feat: add AI service for Vercel AI Gateway"
```

---

## Task 6: Backend — Script Service

**Files:**
- Create: `apps/api/app/services/script_service.py`
- Create: `apps/api/tests/test_script_service.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/test_script_service.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.services.script_service import generate_script
from app.models.script import ScriptRequest

SAMPLE_REQUEST = ScriptRequest(
    niche="optical",
    city="dharmapuri",
    target_audience="Adults 25-45",
    offer="Free eye checkup + 20% off frames",
    goal="leads",
    language="tanglish",
    business_name="Vision Care Optical",
)

MOCK_HOOKS_RESPONSE = {
    "hooks": [
        {"text": "Dharmapuri la innum neraya per glasses illama suffer pannitu irukanga!", "type": "local"},
        {"text": "Kanna problem iruka? Free checkup pannrom!", "type": "curiosity"},
        {"text": "First 50 customers matum — free eye checkup!", "type": "urgency"},
    ]
}

MOCK_SCRIPT_RESPONSE = {
    "script": "[0-3s] Hook text here\n[3-15s] Problem...",
    "cta": "DM us or call 9876543210",
    "caption": "Test caption text",
    "hashtags": ["#DharmapuriOptical", "#FreeEyeCheckup"],
    "posting_time": "Tuesday 7pm",
    "ad_copy": "Test ad copy",
    "video_structure": "Founder on camera introduction",
    "shot_list": ["Shot 1: Founder intro", "Shot 2: Customer testimonial"],
}

FAKE_PROMPT_TEXT = "{{city}} {{offer}} {{audience}} {{few_shot_examples}} {{city_psychology}}"
FAKE_SCRIPT_PROMPT = (
    "{{hook}} {{business_name}} {{niche}} {{city}} {{offer}} "
    "{{target_audience}} {{city_psychology}} {{language}}"
)


@pytest.mark.asyncio
async def test_generate_script_returns_full_response():
    with (
        patch("app.services.script_service.get_top_hooks", AsyncMock(return_value=[])),
        patch(
            "app.services.script_service.generate",
            AsyncMock(side_effect=[MOCK_HOOKS_RESPONSE, MOCK_SCRIPT_RESPONSE]),
        ),
        patch("pathlib.Path.read_text", return_value=FAKE_PROMPT_TEXT),
        patch("pathlib.Path.exists", return_value=True),
    ):
        result = await generate_script(SAMPLE_REQUEST)

    assert len(result.hooks) == 3
    assert result.script == MOCK_SCRIPT_RESPONSE["script"]
    assert result.cta == MOCK_SCRIPT_RESPONSE["cta"]
    assert result.hashtags == MOCK_SCRIPT_RESPONSE["hashtags"]
    assert len(result.shot_list) == 2


@pytest.mark.asyncio
async def test_generate_script_sets_freshness_score_to_1_when_no_top_hooks():
    with (
        patch("app.services.script_service.get_top_hooks", AsyncMock(return_value=[])),
        patch(
            "app.services.script_service.generate",
            AsyncMock(side_effect=[MOCK_HOOKS_RESPONSE, MOCK_SCRIPT_RESPONSE]),
        ),
        patch("pathlib.Path.read_text", return_value=FAKE_PROMPT_TEXT),
        patch("pathlib.Path.exists", return_value=True),
    ):
        result = await generate_script(SAMPLE_REQUEST)

    for hook in result.hooks:
        assert hook.freshness_score == 1.0


@pytest.mark.asyncio
async def test_generate_script_selects_hook_with_highest_freshness():
    with (
        patch("app.services.script_service.get_top_hooks", AsyncMock(return_value=[])),
        patch(
            "app.services.script_service.generate",
            AsyncMock(side_effect=[MOCK_HOOKS_RESPONSE, MOCK_SCRIPT_RESPONSE]),
        ),
        patch("pathlib.Path.read_text", return_value=FAKE_PROMPT_TEXT),
        patch("pathlib.Path.exists", return_value=True),
    ):
        result = await generate_script(SAMPLE_REQUEST)

    assert result.selected_hook.freshness_score == 1.0
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/test_script_service.py -v
```
Expected: `ImportError`

- [ ] **Step 3: Implement script service**

Create `apps/api/app/services/script_service.py`:

```python
from pathlib import Path
from ..core.config import settings
from ..models.script import ScriptRequest, ScriptResponse, HookVariant
from .hook_service import get_top_hooks
from .ai_service import generate

_GOAL_TO_TEMPLATE = {
    "leads": "lead-script.txt",
    "sales": "offer-script.txt",
    "reach": "story-script.txt",
    "engagement": "story-script.txt",
}

_GOAL_TO_TASK = {
    "leads": "lead-script",
    "sales": "offer-script",
    "reach": "story-script",
    "engagement": "story-script",
}


def _read_prompt(relative_path: str) -> str:
    return (Path(settings.prompt_dir) / relative_path).read_text(encoding="utf-8")


def _build_hook_prompt(niche: str, city: str, offer: str, audience: str, few_shot: str, city_psych: str) -> str:
    niche_file = f"hooks/{niche}.txt"
    if not (Path(settings.prompt_dir) / niche_file).exists():
        niche_file = "hooks/optical.txt"
    template = _read_prompt(niche_file)
    return (
        template
        .replace("{{city}}", city)
        .replace("{{offer}}", offer)
        .replace("{{audience}}", audience)
        .replace("{{few_shot_examples}}", few_shot)
        .replace("{{city_psychology}}", city_psych)
    )


def _build_script_prompt(
    goal: str, hook: str, business_name: str, niche: str,
    city: str, offer: str, target_audience: str, city_psych: str, language: str,
) -> str:
    template_file = _GOAL_TO_TEMPLATE.get(goal, "lead-script.txt")
    template = _read_prompt(f"scripts/{template_file}")
    return (
        template
        .replace("{{hook}}", hook)
        .replace("{{business_name}}", business_name)
        .replace("{{niche}}", niche)
        .replace("{{city}}", city)
        .replace("{{offer}}", offer)
        .replace("{{target_audience}}", target_audience)
        .replace("{{city_psychology}}", city_psych)
        .replace("{{language}}", language)
    )


async def generate_script(request: ScriptRequest) -> ScriptResponse:
    city_psych = _read_prompt(f"audience/{request.city}.txt")

    top_hooks = await get_top_hooks(request.niche, request.city)
    few_shot_text = "\n".join(
        f'- "{h["text"]}" (type: {h.get("hook_type", "")})' for h in top_hooks
    ) or "(No examples yet — generate hooks based on city psychology above)"

    hook_prompt = _build_hook_prompt(
        request.niche, request.city, request.offer,
        request.target_audience, few_shot_text, city_psych,
    )
    hooks_data = await generate(hook_prompt, "hooks")
    hooks_raw = hooks_data.get("hooks", [])

    hooks: list[HookVariant] = []
    for h in hooks_raw:
        saturation = next(
            (top.get("saturation_score", 0.0) for top in top_hooks if top.get("text") == h.get("text")),
            0.0,
        )
        hooks.append(HookVariant(
            text=h.get("text", ""),
            type=h.get("type", "curiosity"),
            freshness_score=max(0.0, 1.0 - saturation),
        ))

    selected = max(hooks, key=lambda h: h.freshness_score) if hooks else HookVariant(
        text="", type="curiosity", freshness_score=1.0
    )

    script_prompt = _build_script_prompt(
        goal=request.goal,
        hook=selected.text,
        business_name=request.business_name or request.niche,
        niche=request.niche,
        city=request.city,
        offer=request.offer,
        target_audience=request.target_audience,
        city_psych=city_psych,
        language=request.language,
    )
    task = _GOAL_TO_TASK.get(request.goal, "lead-script")
    script_data = await generate(script_prompt, task)

    return ScriptResponse(
        hooks=hooks,
        selected_hook=selected,
        script=script_data.get("script", ""),
        cta=script_data.get("cta", ""),
        caption=script_data.get("caption", ""),
        hashtags=script_data.get("hashtags", []),
        posting_time=script_data.get("posting_time", ""),
        ad_copy=script_data.get("ad_copy", ""),
        video_structure=script_data.get("video_structure", ""),
        shot_list=script_data.get("shot_list", []),
    )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/test_script_service.py -v
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/script_service.py apps/api/tests/test_script_service.py
git commit -m "feat: add script service — prompt assembly and orchestration"
```

---

## Task 7: Backend — Generate Router

**Files:**
- Create: `apps/api/app/routers/generate.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_generate_router.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/test_generate_router.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import get_current_user
from app.models.script import ScriptResponse, HookVariant

client = TestClient(app)

MOCK_USER = {"id": "user-123", "email": "test@grofast.in"}

MOCK_HOOK = HookVariant(text="Test hook", type="curiosity", freshness_score=1.0)

MOCK_RESPONSE = ScriptResponse(
    hooks=[MOCK_HOOK],
    selected_hook=MOCK_HOOK,
    script="Test script body",
    cta="Call now",
    caption="Test caption",
    hashtags=["#test"],
    posting_time="Tuesday 7pm",
    ad_copy="Test ad copy",
    video_structure="Founder on camera",
    shot_list=["Shot 1: Intro"],
)

VALID_PAYLOAD = {
    "niche": "optical",
    "city": "dharmapuri",
    "target_audience": "Adults 25-45",
    "offer": "Free eye checkup",
    "goal": "leads",
    "language": "tanglish",
}


def test_generate_script_requires_auth():
    response = client.post("/generate/script", json=VALID_PAYLOAD)
    assert response.status_code == 403


def test_generate_script_returns_200_with_valid_input():
    async def mock_user():
        return MOCK_USER

    app.dependency_overrides[get_current_user] = mock_user

    with patch("app.routers.generate.generate_script", AsyncMock(return_value=MOCK_RESPONSE)):
        response = client.post("/generate/script", json=VALID_PAYLOAD)

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["cta"] == "Call now"
    assert len(data["hooks"]) == 1
    assert data["selected_hook"]["text"] == "Test hook"


def test_generate_script_returns_422_with_missing_fields():
    async def mock_user():
        return MOCK_USER

    app.dependency_overrides[get_current_user] = mock_user

    response = client.post("/generate/script", json={"niche": "optical"})

    app.dependency_overrides.clear()

    assert response.status_code == 422
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/test_generate_router.py -v
```
Expected: `ImportError` — router doesn't exist yet.

- [ ] **Step 3: Create generate router**

Create `apps/api/app/routers/generate.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from ..models.script import ScriptRequest, ScriptResponse
from ..services.script_service import generate_script
from ..core.auth import get_current_user

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("/script", response_model=ScriptResponse)
async def generate_script_endpoint(
    request: ScriptRequest,
    user: dict = Depends(get_current_user),
) -> ScriptResponse:
    try:
        return await generate_script(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Prompt template not found: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

- [ ] **Step 4: Register router in main.py**

Replace `apps/api/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .routers.generate import router as generate_router

app = FastAPI(title="ScriptSite API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 5: Run all API tests**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/ -v
```
Expected: `7 passed` (2 health + 2 hook + 3 ai + 3 script + 3 router)

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/routers/generate.py apps/api/app/main.py apps/api/tests/test_generate_router.py
git commit -m "feat: add generate router POST /generate/script"
```

---

## Task 8: Frontend — GeneratorForm Component

**Files:**
- Create: `apps/web/src/components/generate/GeneratorForm.tsx`

- [ ] **Step 1: Create the form component**

Create `apps/web/src/components/generate/GeneratorForm.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { ScriptOutput } from '@scriptsite/shared/types'

const NICHES = [
  { value: 'optical', label: 'Optical Store' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospital', label: 'Hospital / Clinic' },
  { value: 'education', label: 'Education / Coaching' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'agency', label: 'Agency' },
]

const CITIES = [
  { value: 'dharmapuri', label: 'Dharmapuri' },
  { value: 'krishnagiri', label: 'Krishnagiri' },
  { value: 'salem', label: 'Salem' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'hosur', label: 'Hosur' },
  { value: 'karimangalam', label: 'Karimangalam' },
  { value: 'palacode', label: 'Palacode' },
]

const GOALS = [
  { value: 'leads', label: 'Lead Generation' },
  { value: 'reach', label: 'Reach / Brand Awareness' },
  { value: 'sales', label: 'Direct Sales' },
  { value: 'engagement', label: 'Engagement' },
]

const LANGUAGES = [
  { value: 'tanglish', label: 'Tanglish (Tamil + English)' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'english', label: 'English' },
]

interface Props {
  onResult: (result: ScriptOutput) => void
  onLoading: (loading: boolean) => void
}

export function GeneratorForm({ onResult, onLoading }: Props) {
  const [form, setForm] = useState({
    niche: 'optical',
    city: 'dharmapuri',
    target_audience: '',
    offer: '',
    goal: 'leads',
    language: 'tanglish',
    business_name: '',
  })
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    onLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const result = await apiClient.generateScript(
        {
          business_id: '',
          niche: form.niche as any,
          city: form.city as any,
          target_audience: form.target_audience,
          offer: form.offer,
          goal: form.goal as any,
          language: form.language as any,
        },
        session.access_token,
      )
      onResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      onLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Script</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Type</Label>
              <select
                value={form.niche}
                onChange={(e) => set('niche', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {NICHES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <select
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business Name (optional)</Label>
            <Input
              placeholder="e.g. Vision Care Optical"
              value={form.business_name}
              onChange={(e) => set('business_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Input
              placeholder="e.g. Adults 25-45 with vision problems"
              value={form.target_audience}
              onChange={(e) => set('target_audience', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Offer / Promotion</Label>
            <Input
              placeholder="e.g. Free eye checkup + 20% off all frames"
              value={form.offer}
              onChange={(e) => set('offer', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Goal</Label>
              <select
                value={form.goal}
                onChange={(e) => set('goal', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {GOALS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <select
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full">
            Generate Script
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/generate/GeneratorForm.tsx
git commit -m "feat: add GeneratorForm component"
```

---

## Task 9: Frontend — ScriptOutput Component

**Files:**
- Create: `apps/web/src/components/generate/ScriptOutput.tsx`

- [ ] **Step 1: Create the output component**

Create `apps/web/src/components/generate/ScriptOutput.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ScriptOutput, HookVariant } from '@scriptsite/shared/types'

interface Props {
  output: ScriptOutput
}

export function ScriptOutput({ output }: Props) {
  const [selectedHook, setSelectedHook] = useState<HookVariant>(output.selected_hook)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hook Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {output.hooks.map((hook, i) => (
            <button
              key={i}
              onClick={() => setSelectedHook(hook)}
              className={`w-full text-left p-3 rounded-md border text-sm transition-colors ${
                selectedHook.text === hook.text
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span>{hook.text}</span>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="secondary">{hook.type}</Badge>
                  <Badge variant="outline">{Math.round(hook.freshness_score * 100)}% fresh</Badge>
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Script</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm text-zinc-700 font-sans leading-relaxed">
            {output.script}
          </pre>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CTA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{output.cta}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best Posting Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{output.posting_time}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caption</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{output.caption}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hashtags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {output.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad Copy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{output.ad_copy}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shot List</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1 text-sm text-zinc-700 list-decimal list-inside">
            {output.shot_list.map((shot, i) => (
              <li key={i}>{shot}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/generate/ScriptOutput.tsx
git commit -m "feat: add ScriptOutput display component"
```

---

## Task 10: Frontend — Generate Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/generate/page.tsx`

- [ ] **Step 1: Create the generate page**

Create `apps/web/src/app/(dashboard)/generate/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { GeneratorForm } from '@/components/generate/GeneratorForm'
import { ScriptOutput } from '@/components/generate/ScriptOutput'
import type { ScriptOutput as ScriptOutputType } from '@scriptsite/shared/types'

export default function GeneratePage() {
  const [result, setResult] = useState<ScriptOutputType | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Script</h1>
        <p className="text-zinc-500 text-sm">
          Fill in the details below to generate a viral script for your client.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <GeneratorForm onResult={setResult} onLoading={setLoading} />
        </div>

        <div>
          {loading && (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-zinc-50">
              <p className="text-zinc-500 text-sm animate-pulse">Generating your script...</p>
            </div>
          )}
          {!loading && result && <ScriptOutput output={result} />}
          {!loading && !result && (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-zinc-50 border-dashed">
              <p className="text-zinc-400 text-sm">Your generated script will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd apps/web && pnpm exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run all API tests one final time**

```bash
cd apps/api && .venv/Scripts/python -m pytest tests/ -v
```
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/generate/
git commit -m "feat: add generate page with form and output layout"
```

---

## Final Check

After all tasks complete:

1. Start the API: `cd apps/api && .venv/Scripts/uvicorn app.main:app --reload`
2. Confirm `GET http://localhost:8000/health` returns `{"status":"ok"}`
3. Start the web app: `cd apps/web && pnpm dev`
4. Open `http://localhost:3000` — should redirect to `/login`
5. Send a magic link to your email — clicking it should land you on `/dashboard`
6. Navigate to `/generate` — form and empty output pane should appear
7. Add your `VERCEL_AI_GATEWAY_KEY` to `apps/api/.env` and test a real generation
