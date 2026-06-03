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
    try:
        hooks_data = await generate(hook_prompt, "hooks")
    except Exception as exc:
        raise ValueError(f"Hook generation failed: {exc}") from exc
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
    try:
        hooks_data = await generate(hook_prompt, "hooks")
    except Exception as exc:
        raise ValueError(f"Hook generation failed: {exc}") from exc
    hooks = _build_hooks(hooks_data.get("hooks", []), top_hooks)

    if not hooks:
        raise ValueError("AI returned no hook variants — cannot generate script")

    selected = max(hooks, key=lambda h: h.freshness_score)

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
    try:
        script_data = await generate(script_prompt, task)
    except Exception as exc:
        raise ValueError(f"Script generation failed: {exc}") from exc

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
