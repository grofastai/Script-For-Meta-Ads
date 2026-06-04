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
