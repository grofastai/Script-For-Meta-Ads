# Phase 2 Completion — Script Generator End-to-End

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Phase 2 script generator so a user can fill the form, hit Generate, get a real AI-generated script with city psychology + few-shot injection, and have the result saved to Supabase.

**Architecture:** Prompt files already exist and services are already wired; the gaps are (1) missing prompt files for extra cities/niches, (2) `org_id` not threaded through auth, (3) script not saved to DB after generation, (4) saturation score not updated after use, (5) standalone `/generate/hooks` endpoint missing, (6) migrations not applied to Supabase.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, Supabase Python client, Vercel AI Gateway, Next.js 14 App Router, Supabase MCP server

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `packages/ai-engine/prompts/audience/coimbatore.txt` | Create | City psychology for Coimbatore |
| `packages/ai-engine/prompts/audience/hosur.txt` | Create | City psychology for Hosur |
| `packages/ai-engine/prompts/audience/karimangalam.txt` | Create | City psychology for Karimangalam |
| `packages/ai-engine/prompts/audience/palacode.txt` | Create | City psychology for Palacode |
| `packages/ai-engine/prompts/hooks/restaurant.txt` | Create | Hook template for restaurants |
| `packages/ai-engine/prompts/hooks/clothing.txt` | Create | Hook template for clothing stores |
| `packages/ai-engine/prompts/hooks/jewellery.txt` | Create | Hook template for jewellery |
| `packages/ai-engine/prompts/hooks/pharmacy.txt` | Create | Hook template for pharmacies |
| `packages/ai-engine/prompts/hooks/agency.txt` | Create | Hook template for agencies |
| `packages/ai-engine/prompts/scripts/testimonial-script.txt` | Create | Testimonial script template |
| `apps/api/app/core/auth.py` | Modify | Return `org_id` from user profile lookup |
| `apps/api/app/services/hook_service.py` | Modify | Add `update_hook_saturation` function |
| `apps/api/app/services/script_service.py` | Modify | Save generated script to `scripts` table |
| `apps/api/app/routers/generate.py` | Modify | Add `POST /generate/hooks` endpoint; pass `user` to service |
| `apps/api/app/models/script.py` | Modify | Add `HooksOnlyRequest` model; add `script_id` to `ScriptResponse` |

---

### Task 1: Apply DB migrations to Supabase

**Files:**
- Read: `packages/db/migrations/001_schema.sql`
- Read: `packages/db/migrations/002_rls.sql`
- Read: `packages/db/migrations/003_seed.sql`

- [ ] **Step 1: Apply schema migration**

Use the Supabase MCP `apply_migration` tool with the content of `001_schema.sql`. Name it `001_schema`.

- [ ] **Step 2: Apply RLS migration**

Use the Supabase MCP `apply_migration` tool with the content of `002_rls.sql`. Name it `002_rls`.

- [ ] **Step 3: Apply seed migration**

Use the Supabase MCP `apply_migration` tool with the content of `003_seed.sql`. Name it `003_seed`.

- [ ] **Step 4: Verify tables exist**

Use `list_tables` to confirm all 7 tables are present: `organizations`, `user_profiles`, `businesses`, `hooks`, `scripts`, `campaigns`, `scraped_content`, `meta_ads`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/
git commit -m "feat: apply DB schema, RLS policies, and seed data to Supabase"
```

---

### Task 2: Add missing city audience profiles

**Files:**
- Create: `packages/ai-engine/prompts/audience/coimbatore.txt`
- Create: `packages/ai-engine/prompts/audience/hosur.txt`
- Create: `packages/ai-engine/prompts/audience/karimangalam.txt`
- Create: `packages/ai-engine/prompts/audience/palacode.txt`

- [ ] **Step 1: Create coimbatore.txt**

```
AUDIENCE PSYCHOLOGY: COIMBATORE

Location: Coimbatore, Tamil Nadu — Tier 2 city, major industrial and textile hub
Language: Tanglish preferred; English acceptable for business and education niches
Dialect: Kongu Tamil — distinct from Chennai or Dharmapuri Tamil

PSYCHOLOGY PROFILE:
- Business-minded and entrepreneurial. More comfortable with direct sales pitches.
- Education-conscious city — NEET, JEE, engineering coaching is a huge market.
- Textile industry background means high brand awareness for clothing and fabric quality.
- Price-sensitive but quality-aware — they research before buying.
- Strong local identity: calling out "Coimbatore" or "Kovai" grabs attention.
- Social proof via numbers: "1000+ students", "500 families" outperforms vague claims.

LANGUAGE RULES:
- Use "Kovai" as shorthand — it's how locals refer to Coimbatore.
- Common phrases: "Kovai la", "namba area", "industrial city"
- Tanglish with Kongu dialect markers preferred over pure English.

OFFER PSYCHOLOGY:
- Free demo or free first session works well for services.
- Bulk/wholesale framing resonates due to textile trade culture.
- Annual/long-term offers over short-term flash sales.
- Quality certification language ("ISO certified", "NAAC accredited") adds trust.

CONTENT STYLE:
- Data-driven hooks work — quote results, numbers, percentages.
- Professional and direct tone. Less emotional storytelling than smaller districts.
- Show credentials and track record early.
```

- [ ] **Step 2: Create hosur.txt**

```
AUDIENCE PSYCHOLOGY: HOSUR

Location: Hosur, Tamil Nadu — rapidly growing industrial town near Bangalore border
Language: Tanglish; heavy Kannada influence due to proximity to Karnataka
Dialect: Mix of Tamil and some Kannada-influenced speech patterns

PSYCHOLOGY PROFILE:
- Young working population from SIPCOT, Foxconn, TVS, Royal Enfield factories.
- Aspirational: wants city-quality services (Bangalore standard) at Hosur prices.
- High real estate interest — many factory workers buying land or flats.
- Migration city: many people from Dharmapuri, Salem, Krishnagiri districts settled here.
- Price-conscious because factory wages are fixed; value for money is key.
- Weekend buyers — shopping happens Sat/Sun due to shift work.

LANGUAGE RULES:
- Use "Hosur la" as local identifier. "SIPCOT area" resonates with factory workers.
- Tanglish is primary. Avoid pure Kannada references.
- Reference the industrial context: "factory workers", "shift timing", "weekend offer"

OFFER PSYCHOLOGY:
- Weekend/Sunday timing critical for conversion — "Sunday only" offer works.
- EMI/installment for real estate and high-ticket items.
- "Near SIPCOT" or "near factory gate" location messaging builds trust.
- Fast/quick service messaging — workers have limited time.

CONTENT STYLE:
- Short, punchy hooks. This audience consumes content quickly.
- Show the convenience and proximity angle.
- Young demographic — modern, energetic video style over traditional ads.
```

- [ ] **Step 3: Create karimangalam.txt**

```
AUDIENCE PSYCHOLOGY: KARIMANGALAM

Location: Karimangalam, Dharmapuri district — small town / taluk headquarters
Language: Tanglish (Dharmapuri-dialect Tamil)
Dialect: Very similar to Dharmapuri — rural Tamil Nadu speech patterns

PSYCHOLOGY PROFILE:
- Very tight-knit community. Word of mouth is the strongest marketing channel.
- Strong family-based purchase decisions — healthcare, education, optical involve the whole family.
- High trust in local brands and known faces. Unknown brands face skepticism.
- Mango farming and agriculture is the primary economy — seasonal income patterns matter.
- Festival and harvest season (Pongal, after mango season) = peak buying windows.
- Conservative buyers: need strong social proof before committing.

LANGUAGE RULES:
- Use "Karimangalam la" to instantly localize hooks.
- Write in rural Tanglish — more Tamil words than English.
- Avoid corporate or city-level language — it feels distant.
- "Makkale" (folks/people) for direct address is very effective.

OFFER PSYCHOLOGY:
- "First 50 customers free" limited quantity works better than time limits.
- Family pack or family bundle offers resonate.
- Home visit / home delivery is a strong differentiator vs travelling to Salem/Dharmapuri.
- Cash payment friendly — EMI less common than bigger cities.

CONTENT STYLE:
- Extremely local and personal. Show real local faces.
- Founder-led or community-endorsed content.
- Emphasize that they don't have to travel to Salem or Dharmapuri.
- Festival-linked offers timed around Pongal, Diwali, local temple festivals.
```

- [ ] **Step 4: Create palacode.txt**

```
AUDIENCE PSYCHOLOGY: PALACODE

Location: Palacode, Dharmapuri district — small town, panchayat-level market
Language: Tanglish (Dharmapuri-style rural Tamil)
Dialect: Rural Dharmapuri Tamil — closest to Karimangalam profile

PSYCHOLOGY PROFILE:
- Very small market. Almost everyone knows each other — hyper-local trust economy.
- Agriculture-based economy (sugarcane, groundnut, mango). Income is seasonal.
- Extremely skeptical of advertising. Needs community endorsement to buy.
- Strong referral culture: "my neighbour used it" beats any ad.
- Healthcare and education are priority spend areas even in low-income households.
- Most residents travel to Dharmapuri or Krishnagiri for major purchases.

LANGUAGE RULES:
- "Palacode la" or "namma ooru la" (our town) resonates deeply.
- Write in pure Tanglish with rural Tamil — minimal English words.
- Avoid anything that sounds "big city" or corporate.

OFFER PSYCHOLOGY:
- Free first visit or free checkup is the best lead magnet.
- "No need to go to Dharmapuri" messaging is powerful — saves travel + cost.
- WhatsApp-based CTA works better than website or app-based CTAs.
- Trust-based testimonials from local people (named, known faces) are essential.

CONTENT STYLE:
- Hyper-local references — mention local landmarks, market days.
- Real customer faces from the same town.
- Keep video short (30-45 sec). Attention span for ads is low.
- Community/temple event tie-ins perform well.
```

- [ ] **Step 5: Commit**

```bash
git add packages/ai-engine/prompts/audience/
git commit -m "feat: add city audience psychology profiles for Coimbatore, Hosur, Karimangalam, Palacode"
```

---

### Task 3: Add missing niche hook templates

**Files:**
- Create: `packages/ai-engine/prompts/hooks/restaurant.txt`
- Create: `packages/ai-engine/prompts/hooks/clothing.txt`
- Create: `packages/ai-engine/prompts/hooks/jewellery.txt`
- Create: `packages/ai-engine/prompts/hooks/pharmacy.txt`
- Create: `packages/ai-engine/prompts/hooks/agency.txt`

- [ ] **Step 1: Create restaurant.txt**

```
HOOK GENERATION: RESTAURANT / FOOD BUSINESS

CONTEXT VARIABLES (injected at runtime):
- {{city}}: the target city
- {{offer}}: the current offer/promotion
- {{audience}}: the target audience segment
- {{few_shot_examples}}: top 3-5 performing hooks from the database
- {{city_psychology}}: the city psychology profile text

INSTRUCTIONS:
Generate 3 hook variants for a restaurant or food business in {{city}}.
Write in Tanglish unless city is Chennai (English-first acceptable).

Each hook must be under 15 words. Hooks are the FIRST LINE of a social media reel.

Hook types to use:
1. Curiosity — tease the food/dish/secret recipe
2. Urgency — limited seats, limited quantity, daily special
3. Local — call out the city and local food culture
4. Problem-Solution — hunger, craving, occasion need
5. Social Proof — "1000 plates served", customer reactions

OFFER: {{offer}}
CITY: {{city}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS (style reference only, do NOT copy):
{{few_shot_examples}}

AUDIENCE PSYCHOLOGY:
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

- [ ] **Step 2: Create clothing.txt**

```
HOOK GENERATION: CLOTHING / FASHION STORE

CONTEXT VARIABLES (injected at runtime):
- {{city}}: the target city
- {{offer}}: the current offer/promotion
- {{audience}}: the target audience segment
- {{few_shot_examples}}: top 3-5 performing hooks from the database
- {{city_psychology}}: the city psychology profile text

INSTRUCTIONS:
Generate 3 hook variants for a clothing or fashion store in {{city}}.
Write in Tanglish. Festival and occasion context performs extremely well for clothing.

Each hook must be under 15 words. Hooks are the FIRST LINE of a social media reel.

Hook types to use:
1. Curiosity — tease a new collection, a style transformation
2. Urgency — festival offer, last pieces, sale ending
3. Local — reference local fashion culture and festivals
4. Social Proof — "worn by 500 brides", "trending in [city]"
5. Problem-Solution — "don't know what to wear for the function?"

OFFER: {{offer}}
CITY: {{city}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS (style reference only, do NOT copy):
{{few_shot_examples}}

AUDIENCE PSYCHOLOGY:
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

- [ ] **Step 3: Create jewellery.txt**

```
HOOK GENERATION: JEWELLERY STORE

CONTEXT VARIABLES (injected at runtime):
- {{city}}: the target city
- {{offer}}: the current offer/promotion
- {{audience}}: the target audience segment
- {{few_shot_examples}}: top 3-5 performing hooks from the database
- {{city_psychology}}: the city psychology profile text

INSTRUCTIONS:
Generate 3 hook variants for a jewellery store in {{city}}.
Write in Tanglish. Jewellery purchases are emotional and occasion-driven — hooks should reflect that.

Each hook must be under 15 words. Hooks are the FIRST LINE of a social media reel.

Key emotional triggers for jewellery:
- Weddings, engagements, baby showers (gold buying occasions)
- Investment angle: "gold is savings"
- Family tradition: "just like your grandmother"
- Festival buying: Akshaya Tritiya, Diwali, Pongal

Hook types to use:
1. Curiosity — tease a new design or collection
2. Urgency — rising gold rates, festival offer ending
3. Local — "{{city}} la bestselling design"
4. Social Proof — "500 families trusted us for their wedding gold"
5. Emotion — connect to a life occasion

OFFER: {{offer}}
CITY: {{city}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS (style reference only, do NOT copy):
{{few_shot_examples}}

AUDIENCE PSYCHOLOGY:
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

- [ ] **Step 4: Create pharmacy.txt**

```
HOOK GENERATION: PHARMACY / MEDICAL STORE

CONTEXT VARIABLES (injected at runtime):
- {{city}}: the target city
- {{offer}}: the current offer/promotion
- {{audience}}: the target audience segment
- {{few_shot_examples}}: top 3-5 performing hooks from the database
- {{city_psychology}}: the city psychology profile text

INSTRUCTIONS:
Generate 3 hook variants for a pharmacy or medical store in {{city}}.
Write in Tanglish. Health content needs to build trust quickly — avoid alarmist language.
Do NOT make medical claims. Focus on convenience, availability, and service quality.

Each hook must be under 15 words. Hooks are the FIRST LINE of a social media reel.

Hook types to use:
1. Curiosity — a health tip or little-known fact about medicines/health
2. Urgency — availability of a specific medicine, limited stock
3. Local — 24-hour pharmacy, home delivery in {{city}}
4. Social Proof — "trusted by 1000+ families in {{city}}"
5. Problem-Solution — "medicine out of stock at other shops? We have it."

OFFER: {{offer}}
CITY: {{city}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS (style reference only, do NOT copy):
{{few_shot_examples}}

AUDIENCE PSYCHOLOGY:
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

- [ ] **Step 5: Create agency.txt**

```
HOOK GENERATION: MARKETING AGENCY / DIGITAL SERVICES

CONTEXT VARIABLES (injected at runtime):
- {{city}}: the target city
- {{offer}}: the current offer/promotion
- {{audience}}: the target audience segment
- {{few_shot_examples}}: top 3-5 performing hooks from the database
- {{city_psychology}}: the city psychology profile text

INSTRUCTIONS:
Generate 3 hook variants for a marketing or digital services agency in {{city}}.
Write in Tanglish. The audience is business owners — hooks should speak to their business pain points.

Each hook must be under 15 words. Hooks are the FIRST LINE of a social media reel.

Key pain points for business owner audience:
- Not getting enough leads from ads
- Wasting money on ads that don't work
- Competitors doing better on social media
- Don't know how to use digital marketing

Hook types to use:
1. Curiosity — expose a marketing mistake business owners make
2. Urgency — limited client slots, campaign season
3. Local — "{{city}} la business owners see this"
4. Social Proof — "50 businesses in {{city}} grew with us"
5. Problem-Solution — "wasting money on ads? here's why"

OFFER: {{offer}}
CITY: {{city}}
AUDIENCE: {{audience}}

PAST WINNING HOOKS (style reference only, do NOT copy):
{{few_shot_examples}}

AUDIENCE PSYCHOLOGY:
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

- [ ] **Step 6: Commit**

```bash
git add packages/ai-engine/prompts/hooks/
git commit -m "feat: add hook templates for restaurant, clothing, jewellery, pharmacy, agency niches"
```

---

### Task 4: Add testimonial script template

**Files:**
- Create: `packages/ai-engine/prompts/scripts/testimonial-script.txt`

- [ ] **Step 1: Create testimonial-script.txt**

```
SCRIPT GENERATION: TESTIMONIAL / SOCIAL PROOF SCRIPT

GOAL: Build trust through real customer story, drive leads via credibility

CONTEXT:
- Hook: {{hook}}
- Business: {{business_name}} ({{niche}}) in {{city}}
- Offer: {{offer}}
- Target Audience: {{target_audience}}
- City Psychology: {{city_psychology}}
- Language: {{language}}

SCRIPT STRUCTURE (45-75 second reel):
1. Hook (0-3 sec): Use the provided hook exactly
2. Customer intro (3-10 sec): "Oru customer story solren..." — introduce the customer (keep anonymous or use first name only)
3. Before state (10-25 sec): What problem they had before
4. The solution (25-40 sec): How this business solved it — specific, concrete
5. Result (40-55 sec): The outcome — numbers if possible ("power reduced", "saved Rs.X", "got job in 3 months")
6. CTA (55-65 sec): "Unga story idha maadiri aaganuma? Call pannunga / DM pannunga"
7. Offer (65-75 sec): Add the current offer as an incentive to act now

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

- [ ] **Step 2: Commit**

```bash
git add packages/ai-engine/prompts/scripts/testimonial-script.txt
git commit -m "feat: add testimonial script prompt template"
```

---

### Task 5: Add org_id to auth middleware

The `get_current_user` dependency only returns `{id, email}`. Services need `org_id` to save scripts with correct multi-tenancy. We look up the user's `org_id` from `user_profiles`.

**Files:**
- Modify: `apps/api/app/core/auth.py`

- [ ] **Step 1: Update auth.py to fetch org_id**

Replace the entire `apps/api/app/core/auth.py` with:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .database import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        supabase = get_supabase()
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        user_id = response.user.id
        profile = (
            supabase.table("user_profiles")
            .select("org_id")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        org_id = profile.data["org_id"] if profile.data else None
        return {"id": user_id, "email": response.user.email, "org_id": org_id}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/core/auth.py
git commit -m "feat: return org_id from get_current_user by looking up user_profiles"
```

---

### Task 6: Add script_id to ScriptResponse and HooksOnlyRequest model

**Files:**
- Modify: `apps/api/app/models/script.py`

- [ ] **Step 1: Update models**

Replace `apps/api/app/models/script.py` with:

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
    business_id: Optional[str] = None


class HooksOnlyRequest(BaseModel):
    niche: str
    city: str
    target_audience: str
    offer: str
    language: str = "tanglish"


class HookVariant(BaseModel):
    text: str
    type: str  # 'curiosity' | 'urgency' | 'local' | 'problem-solution' | 'social-proof'
    freshness_score: float


class HooksOnlyResponse(BaseModel):
    hooks: list[HookVariant]


class ScriptResponse(BaseModel):
    script_id: Optional[str] = None
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

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/models/script.py
git commit -m "feat: add HooksOnlyRequest/Response models and script_id to ScriptResponse"
```

---

### Task 7: Save generated script to DB and update hook saturation

**Files:**
- Modify: `apps/api/app/services/hook_service.py`
- Modify: `apps/api/app/services/script_service.py`

- [ ] **Step 1: Update hook_service.py**

Replace `apps/api/app/services/hook_service.py` with:

```python
from datetime import datetime, timezone
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


async def increment_hook_use(hook_text: str, niche: str, city: str, org_id: str) -> None:
    """Increment use_count for a hook and recalculate saturation_score.

    saturation_score = min(use_count / 10, 1.0) — score of 1.0 means hook is oversaturated.
    """
    supabase = get_supabase()
    match = (
        supabase.table("hooks")
        .select("id, use_count")
        .eq("text", hook_text)
        .eq("niche", niche)
        .eq("org_id", org_id)
        .maybe_single()
        .execute()
    )
    if not match.data:
        return
    new_count = (match.data.get("use_count") or 0) + 1
    saturation = min(new_count / 10.0, 1.0)
    supabase.table("hooks").update({
        "use_count": new_count,
        "saturation_score": saturation,
        "last_used_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", match.data["id"]).execute()
```

- [ ] **Step 2: Update script_service.py to save to DB and update saturation**

Replace `apps/api/app/services/script_service.py` with:

```python
import json
from pathlib import Path
from ..core.config import settings
from ..core.database import get_supabase
from ..models.script import ScriptRequest, ScriptResponse, HookVariant, HooksOnlyRequest, HooksOnlyResponse
from .hook_service import get_top_hooks, increment_hook_use
from .ai_service import generate

_GOAL_TO_TEMPLATE = {
    "leads": "lead-script.txt",
    "sales": "offer-script.txt",
    "reach": "story-script.txt",
    "engagement": "story-script.txt",
    "testimonial": "testimonial-script.txt",
}

_GOAL_TO_TASK = {
    "leads": "lead-script",
    "sales": "offer-script",
    "reach": "story-script",
    "engagement": "story-script",
    "testimonial": "testimonial-script",
}


def _read_prompt(relative_path: str) -> str:
    return (Path(settings.prompt_dir) / relative_path).read_text(encoding="utf-8")


def _build_hook_prompt(
    niche: str, city: str, offer: str, audience: str, few_shot: str, city_psych: str
) -> str:
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


def _load_city_psych(city: str) -> str:
    city_file = f"audience/{city}.txt"
    if not (Path(settings.prompt_dir) / city_file).exists():
        city_file = "audience/dharmapuri.txt"
    return _read_prompt(city_file)


def _build_hooks(hooks_raw: list[dict], top_hooks: list[dict]) -> list[HookVariant]:
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
    return hooks


async def generate_hooks_only(request: HooksOnlyRequest) -> HooksOnlyResponse:
    city_psych = _load_city_psych(request.city)
    top_hooks = await get_top_hooks(request.niche, request.city)
    few_shot_text = "\n".join(
        f'- "{h["text"]}" (type: {h.get("hook_type", "")})' for h in top_hooks
    ) or "(No examples yet — generate hooks based on city psychology above)"

    hook_prompt = _build_hook_prompt(
        request.niche, request.city, request.offer,
        request.target_audience, few_shot_text, city_psych,
    )
    hooks_data = await generate(hook_prompt, "hooks")
    hooks = _build_hooks(hooks_data.get("hooks", []), top_hooks)
    return HooksOnlyResponse(hooks=hooks)


async def generate_script(request: ScriptRequest, user: dict) -> ScriptResponse:
    city_psych = _load_city_psych(request.city)

    top_hooks = await get_top_hooks(request.niche, request.city)
    few_shot_text = "\n".join(
        f'- "{h["text"]}" (type: {h.get("hook_type", "")})' for h in top_hooks
    ) or "(No examples yet — generate hooks based on city psychology above)"

    hook_prompt = _build_hook_prompt(
        request.niche, request.city, request.offer,
        request.target_audience, few_shot_text, city_psych,
    )
    hooks_data = await generate(hook_prompt, "hooks")
    hooks = _build_hooks(hooks_data.get("hooks", []), top_hooks)

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

    output = ScriptResponse(
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

    # Persist to DB and update saturation (best-effort — don't fail the request)
    org_id = user.get("org_id")
    if org_id:
        try:
            supabase = get_supabase()
            record = supabase.table("scripts").insert({
                "org_id": org_id,
                "business_id": request.business_id or None,
                "user_id": user["id"],
                "input_params": request.model_dump(),
                "output": output.model_dump(),
                "model_used": task,
            }).execute()
            if record.data:
                output.script_id = record.data[0]["id"]

            if selected.text:
                await increment_hook_use(selected.text, request.niche, request.city, org_id)
        except Exception:
            pass  # persistence failure must not block the generation response

    return output
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/services/hook_service.py apps/api/app/services/script_service.py
git commit -m "feat: save generated scripts to DB, update hook saturation on use"
```

---

### Task 8: Add POST /generate/hooks endpoint and thread user through

**Files:**
- Modify: `apps/api/app/routers/generate.py`

- [ ] **Step 1: Update generate.py**

Replace `apps/api/app/routers/generate.py` with:

```python
from fastapi import APIRouter, Depends, HTTPException
from ..models.script import ScriptRequest, ScriptResponse, HooksOnlyRequest, HooksOnlyResponse
from ..services.script_service import generate_script, generate_hooks_only
from ..core.auth import get_current_user

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("/script", response_model=ScriptResponse)
async def generate_script_endpoint(
    request: ScriptRequest,
    user: dict = Depends(get_current_user),
) -> ScriptResponse:
    try:
        return await generate_script(request, user)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Prompt template not found: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/hooks", response_model=HooksOnlyResponse)
async def generate_hooks_endpoint(
    request: HooksOnlyRequest,
    user: dict = Depends(get_current_user),
) -> HooksOnlyResponse:
    try:
        return await generate_hooks_only(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Prompt template not found: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/routers/generate.py
git commit -m "feat: add POST /generate/hooks endpoint; pass user dict to generate_script"
```

---

## Self-Review

**Spec coverage check:**
- ✅ City psychology injected into every generation — done via `_load_city_psych` with fallback
- ✅ Few-shot examples pulled from Supabase (performance_score filter, same niche+city) — `get_top_hooks`
- ✅ Saturation check — `increment_hook_use` recalculates `saturation_score = min(use_count/10, 1.0)` after each generation
- ✅ DB migrations applied — Task 1
- ✅ Scripts saved to DB — Task 7
- ✅ org_id isolation — auth middleware returns it, scripts table insert uses it
- ✅ All 8 cities in the frontend form covered by prompt files after Task 2
- ✅ All 9 niches in the frontend form covered by prompt files after Task 3
- ✅ `POST /generate/hooks` standalone endpoint — Task 8
- ✅ `testimonial-script.txt` — Task 4
- ✅ `HooksOnlyRequest` model — Task 6

**Type consistency check:**
- `generate_script(request, user)` signature matches call in `generate.py` ✅
- `generate_hooks_only(request)` signature matches call in `generate.py` ✅
- `HooksOnlyRequest` and `HooksOnlyResponse` defined in models and imported in both router and service ✅
- `script_id: Optional[str]` on `ScriptResponse` — set from DB insert result ✅
- `increment_hook_use(hook_text, niche, city, org_id)` — called with correct args ✅

**Placeholder scan:** No TBDs, no "implement later", no steps without code. ✅
