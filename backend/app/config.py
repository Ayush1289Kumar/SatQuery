from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PrithviQ API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    allowed_origins: str = "http://localhost:5173"
    jwt_secret: str | None = None
    jwt_issuer: str = "prithviq-api"
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    database_url: str | None = None
    redis_url: str | None = None
    object_storage_endpoint: str | None = None
    object_storage_bucket: str = "prithviq-private"
    object_storage_access_key: str | None = None
    object_storage_secret_key: str | None = None
    model_registry_url: str | None = None
    model_registry_token: str | None = None
    nominatim_base_url: str = "https://nominatim.openstreetmap.org"
    nominatim_user_agent: str | None = None
    sentry_dsn: str | None = None

    # Real AI provider (Task 4): 'mock' keeps the deterministic demo worker;
    # 'gemini' enables real Gemini answer generation with automatic fallback.
    ai_provider: Literal["mock", "gemini"] = "mock"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    gemini_timeout_s: float = 45.0

    # Demo milestone (api.md section 11): deterministic in-memory lifecycle.
    demo_mode: bool = True
    strict_pair_validation: bool = False
    max_upload_bytes: int = 1_073_741_824
    demo_user_id: str = "usr_demo_analyst"
    demo_user_email: str = "demo@prithviq.local"
    demo_user_role: str = "analyst"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
