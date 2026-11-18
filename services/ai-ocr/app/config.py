from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env files."""

    SERVICE_NAME: str = Field(default="tribalscholar-ai-ocr", description="Service identifier")
    VERSION: str = Field(default="1.0.0", description="Semantic service version")
    ENV: str = Field(default="development", description="Runtime environment")
    HOST: str = Field(default="0.0.0.0", description="Bind host")
    PORT: int = Field(default=8000, description="Bind port")
    DEBUG: bool = Field(default=False, description="Debug mode")

    # Internal Security & Authentication
    INTERNAL_API_KEY: str = Field(
        default="tribalscholar_internal_secret_key_2026",
        description="Shared secret key for internal service-to-service communication",
    )
    INTERNAL_API_KEY_HEADER: str = Field(
        default="X-Internal-Api-Key",
        description="HTTP header name expected for internal API key authentication",
    )

    # PaddleOCR & Hardware Settings
    OCR_USE_GPU: bool = Field(
        default=False,
        description="Enable GPU acceleration if supported CUDA/ROCm environment exists",
    )
    OCR_ENGINE_MODE: str = Field(
        default="auto",
        description="Engine mode: 'auto' (use PaddleOCR with fallback), 'paddle', or 'synthetic'",
    )
    OCR_LANG: str = Field(
        default="en",
        description="Primary language for PaddleOCR text detection and recognition",
    )

    # Document Processing Limits
    MAX_FILE_SIZE_MB: int = Field(default=10, description="Maximum allowed document size in megabytes")
    ALLOWED_EXTENSIONS: List[str] = Field(
        default=[".pdf", ".png", ".jpg", ".jpeg"],
        description="Permitted document upload extensions",
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
