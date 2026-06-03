import json
import httpx
from ..core.config import settings

_MODEL_MAP = {
    "hooks": "gpt-4o",
    "lead-script": "claude-sonnet-4-5",
    "story-script": "claude-sonnet-4-5",
    "offer-script": "gpt-4o",
    "testimonial-script": "claude-sonnet-4-5",
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
