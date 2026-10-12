"""Tests for loading settings from the environment."""

import pytest

from app.config import load_settings


def test_defaults_are_used_when_variables_are_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("APP_HOST", "APP_PORT", "APP_OLLAMA_URL", "APP_OLLAMA_MODEL"):
        monkeypatch.delenv(name, raising=False)

    settings = load_settings()

    assert settings.port == 8000
    assert settings.ollama_url == "http://localhost:11434"


def test_environment_variables_override_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_PORT", "9000")
    monkeypatch.setenv("APP_OLLAMA_MODEL", "other-model")

    settings = load_settings()

    assert settings.port == 9000
    assert settings.ollama_model == "other-model"
