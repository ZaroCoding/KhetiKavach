"""Application settings, read from environment variables only (see .env.example)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Comma-separated list of browser origins allowed by CORS.
    cors_origins: str = "*"
    database_url: str = "postgresql://khetkavach:khetkavach@localhost:5432/khetkavach"
    admin_key: str = ""
    log_level: str = "INFO"

    # LLM. "gemini-flash-latest" is Google's alias that tracks the current Flash model.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # Multilingual embeddings on CPU (ONNX via fastembed), 384 dimensions.
    embed_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    # Satellite: Sentinel Hub primary, Planetary Computer fallback (antigravity prompt #2)
    cdse_client_id: str = ""
    cdse_client_secret: str = ""
    satellite_primary: str = "sentinel_hub"  # or "planetary_computer_s2"

    # Telegram bot.
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""

    # Quality-gate thresholds.
    max_cloud_fraction: float = 0.30
    max_optical_age_days: int = 12
    max_weather_age_hours: int = 12

    # Connector timeouts in seconds (CLAUDE.md rule 3).
    weather_timeout_s: float = 8.0
    imagery_timeout_s: float = 20.0

    # Alert rule (CONTRACTS.md, POST /api/jobs/monitor).
    alert_probability: float = 0.5

    model_path: str = "models/dryspell_lgbm.joblib"
    model_metrics_path: str = "models/dryspell_metrics.json"
    query_vectors_path: str = "models/query_vectors.npz"

    @property
    def cors_origin_list(self) -> list[str]:
        # Strip trailing slashes so origins match RFC 6454 Origin headers.
        origins: list[str] = []
        for o in self.cors_origins.split(","):
            val = o.strip()
            if not val:
                continue
            origins.append(val.rstrip("/") if val != "/" else "/")
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
