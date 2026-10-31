"""Application settings, read from environment variables only."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Comma-separated list of browser origins allowed by CORS.
    cors_origins: str = "http://localhost:3000"

    # SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host:5432/db. Empty = not configured.
    database_url: str = ""

    # Client-supplied secrets checked against request headers. Empty = always rejected.
    admin_key: str = ""
    telegram_webhook_secret: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
