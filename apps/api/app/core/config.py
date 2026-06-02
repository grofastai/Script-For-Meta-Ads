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
