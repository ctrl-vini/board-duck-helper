"""Application settings loaded from environment variables."""

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    """Immutable runtime configuration."""

    host: str
    port: int
    ollama_url: str
    ollama_model: str
    static_dir: Path


def load_settings() -> Settings:
    """Build the settings from APP_* environment variables, falling back to defaults."""
    return Settings(
        host=os.getenv("APP_HOST", "0.0.0.0"),
        port=int(os.getenv("APP_PORT", "8000")),
        ollama_url=os.getenv("APP_OLLAMA_URL", "http://localhost:11434"),
        ollama_model=os.getenv("APP_OLLAMA_MODEL", "qwen2.5-coder:7b"),
        static_dir=PROJECT_ROOT / "static",
    )
