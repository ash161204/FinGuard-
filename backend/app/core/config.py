from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "FinGuard Backend"
    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    api_v1_prefix: str = "/api/v1"

    backend_host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")

    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/finguard",
        alias="DATABASE_URL",
    )
    engine_service_url: str = Field(default="http://localhost:3001", alias="ENGINE_SERVICE_URL")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash-lite", alias="GEMINI_MODEL")
    gemini_base_url: str = Field(
        default="https://generativelanguage.googleapis.com",
        alias="GEMINI_BASE_URL",
    )
    upload_dir: str = Field(default="backend/storage/uploads", alias="UPLOAD_DIR")
    ocr_lang: str = Field(default="eng", alias="OCR_LANG")
    max_upload_size_mb: int = 15
    demo_user_id: str = Field(
        default="00000000-0000-0000-0000-000000000001",
        alias="DEMO_USER_ID",
    )

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)


@lru_cache
def get_settings() -> Settings:
    return Settings()
