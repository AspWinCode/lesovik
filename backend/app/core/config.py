from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="infra/.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_list_delimiter=",",   # parse LIST fields as comma-separated, not JSON
    )

    # App
    APP_ENV: Literal["development", "testing", "production"] = "development"
    APP_NAME: str = "No-Code Platform API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    # Database
    DATABASE_URL: PostgresDsn
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: RedisDsn = "redis://localhost:6379/0"  # type: ignore[assignment]

    # JWT — RS256
    JWT_PRIVATE_KEY: str = ""   # PEM, populated from env/secret
    JWT_PUBLIC_KEY: str = ""    # PEM, populated from env/secret
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    @field_validator("JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", mode="before")
    @classmethod
    def normalize_pem(cls, v: str) -> str:
        # Allow single-line PEM in env files (newlines escaped as \n).
        if isinstance(v, str) and "\\n" in v:
            return v.replace("\\n", "\n")
        return v

    # S3 / MinIO
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_FILES: str = "nocode-files"
    S3_BUCKET_EXPORTS: str = "nocode-exports"
    S3_REGION: str = "us-east-1"

    # SMTP
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = False
    EMAIL_FROM: str = "noreply@nocode.local"

    # Seed (development bootstrap admin)
    SEED_ADMIN_EMAIL: str = "admin@nocode.local"
    SEED_ADMIN_PASSWORD: str = "ChangeMe123!"
    SEED_ADMIN_NAME: str = "Platform Admin"

    # CORS — plain strings, validated at middleware level
    CORS_ORIGINS: list[str] = []

    # ClamAV
    CLAMAV_HOST: str = "clamav"
    CLAMAV_PORT: int = 3310

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 200

    # Rate limiting (requests / minute per user)
    RATE_LIMIT_DEFAULT: int = 300
    RATE_LIMIT_AUTH: int = 20

    # OpenTelemetry
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    OTEL_SERVICE_NAME: str = "nocode-backend"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
