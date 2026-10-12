"""Shared pytest fixtures."""

import json
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, load_settings
from app.main import create_app
from app.schemas.board import BoardProfile
from tests.fakes import FakeLlmClient


@pytest.fixture
def board_profile_data() -> dict[str, Any]:
    """A valid board profile, as it appears in a profile file."""
    return {
        "id": "test-board",
        "name": "Test Board",
        "microcontroller": "ESP32",
        "language": "C++",
        "framework": "Arduino",
        "components": [{"name": "LED", "type": "digital output", "pins": [{"gpio": 2}]}],
        "notes": ["Example note"],
    }


@pytest.fixture
def board_profile(board_profile_data: dict[str, Any]) -> BoardProfile:
    """The sample profile as a validated model."""
    return BoardProfile.model_validate(board_profile_data)


@pytest.fixture
def boards_dir(tmp_path: Path, board_profile_data: dict[str, Any]) -> Path:
    """Temporary profile directory holding one valid profile."""
    directory = tmp_path / "boards"
    directory.mkdir()
    (directory / "test-board.json").write_text(json.dumps(board_profile_data), encoding="utf-8")
    return directory


@pytest.fixture
def settings(boards_dir: Path) -> Settings:
    """Default settings pointed at the temporary data directories."""
    return replace(
        load_settings(),
        boards_dir=boards_dir,
        conversations_dir=boards_dir.parent / "conversations",
    )


@pytest.fixture
def llm_client() -> FakeLlmClient:
    """Fake model that replies instantly with a fixed answer."""
    return FakeLlmClient()


@pytest.fixture
def client(settings: Settings, llm_client: FakeLlmClient) -> TestClient:
    """HTTP client bound to a fresh application that uses the fake model."""
    return TestClient(create_app(settings, llm_client))
