"""
QueryMind Configuration
Loads environment variables with validation and defaults.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # OpenRouter API key for LLMs
    openrouter_api_key: str = ""

    # Default SQLite database path (relative to backend/)
    default_db_path: str = "./sample.db"

    # CORS allowed origins (comma-separated string)
    allowed_origins: str = "http://localhost:5173"

    # Whether write mode (INSERT/UPDATE/DELETE) is enabled globally
    write_mode_enabled: bool = False

    # Maximum number of rows returned per query
    max_rows_returned: int = 500

    # Rate limit: requests per minute per session
    rate_limit_per_minute: int = 20

    # Model ID for OpenRouter
    model_id: str = "anthropic/claude-sonnet-4"

    # OpenRouter headers
    app_referer: str = "https://querymind.app"
    app_title: str = "QueryMind SQL Assistant"

    @property
    def origins_list(self) -> list[str]:
        """Parse ALLOWED_ORIGINS into a list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def has_api_key(self) -> bool:
        """Check if a valid API key is configured."""
        dummy_keys = {"sk-or-v1-your_key_here", "your-openrouter-api-key-here"}
        return bool(self.openrouter_api_key) and self.openrouter_api_key not in dummy_keys

    class Config:
        env_file = (
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            os.path.join(os.path.dirname(__file__), ".env"),
        )
        env_file_encoding = "utf-8"
        extra = "ignore"


# Singleton settings instance
settings = Settings()
