"""
AI worker configuration via pydantic-settings.
All values come from environment variables (or .env file).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    redis_url: str = "redis://localhost:6379"

    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "chizlab-media"

    internal_callback_url: str = "http://localhost:3000/internal/ai-result"
    internal_callback_secret: str = ""

    # Options: "gemini" | "openai" | "claude"
    ai_provider: str = "gemini"

    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
