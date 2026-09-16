from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, anchored to this file so it is found no matter which directory
# the server (or pytest) is started from — including the documented repo-root
# start:  python -m uvicorn backend.app.main:app --reload --port 8000
# Real environment variables still take priority over these file values.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


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
    # Fallback default only; GEMINI_MODEL in backend/.env (or OS env) overrides.
    # gemini-2.0-flash is shut down at the API — do not regress to 2.x/3.5.
    gemini_model: str = "gemini-3.8-flash"
    gemini_timeout_s: float = 45.0

    # Google Earth Engine (M2). ee_client.py initializes lazily on first use;
    # only the credential PATH is configured here — never secret contents.
    # Relative paths are anchored to the repository root. Default disabled:
    # set EE_ENABLED=true to let the EE tool executors initialize.
    ee_enabled: bool = False
    ee_credentials_path: str = "backend/credentials/satquery-earth-engine.json"

    # Analysis tool engine (M3): "template" = deterministic demo worker
    # (default, byte-identical behavior); "earthengine" = opt-in real EE
    # computation for registered tools (currently water_mapping), with
    # automatic fail-closed fallback to the template executor.
    tools_engine: Literal["template", "earthengine"] = "template"

    # M3 Sentinel-2 scene selection (explicit + documented values from the M3
    # investigation). The bounded search window is anchored on the
    # upload-derived acquisition date — never on "today" — and the least-cloudy
    # qualifying scene is selected. The scene's REAL acquisition date and cloud
    # cover are always recorded in the tool trace/metrics, so a relaxed ceiling
    # can never silently imply that the declared date was matched.
    # Override in backend/.env with EE_SCENE_LOOKBACK_DAYS /
    # EE_SCENE_FORWARD_DAYS / EE_MAX_CLOUD_PERCENT.
    # Defaults: 45-day lookback + 4 forward days (end exclusive, so the three
    # days after the anchor are included) and a 50% monsoon-season ceiling.
    ee_scene_lookback_days: int = Field(default=45, ge=0, le=365)
    ee_scene_forward_days: int = Field(default=4, ge=0, le=365)
    ee_max_cloud_percent: float = Field(default=50.0, gt=0, le=100)

    # Demo milestone (api.md section 11): deterministic in-memory lifecycle.
    demo_mode: bool = True
    strict_pair_validation: bool = False
    max_upload_bytes: int = 1_073_741_824
    demo_user_id: str = "usr_demo_analyst"
    demo_user_email: str = "demo@prithviq.local"
    demo_user_role: str = "analyst"

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
