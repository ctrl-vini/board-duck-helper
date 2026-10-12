"""Tests for loading and querying board profiles."""

import json
from pathlib import Path
from typing import Any

import pytest

from app.config import DEFAULT_BOARDS_DIR
from app.exceptions import BoardNotFoundError, InvalidBoardProfileError
from app.services.board_registry import BoardRegistry


def test_loads_every_profile_in_the_directory(boards_dir: Path) -> None:
    registry = BoardRegistry.from_directory(boards_dir)

    assert [board.id for board in registry.list_boards()] == ["test-board"]


def test_get_board_returns_the_matching_profile(boards_dir: Path) -> None:
    registry = BoardRegistry.from_directory(boards_dir)

    assert registry.get_board("test-board").name == "Test Board"


def test_get_board_rejects_unknown_ids(boards_dir: Path) -> None:
    registry = BoardRegistry.from_directory(boards_dir)

    with pytest.raises(BoardNotFoundError):
        registry.get_board("missing-board")


@pytest.mark.parametrize(
    "content",
    [
        pytest.param("{not json", id="malformed-json"),
        pytest.param(json.dumps({"id": "incomplete"}), id="missing-fields"),
    ],
)
def test_rejects_invalid_files_naming_the_file(boards_dir: Path, content: str) -> None:
    (boards_dir / "broken.json").write_text(content, encoding="utf-8")

    with pytest.raises(InvalidBoardProfileError, match="broken.json"):
        BoardRegistry.from_directory(boards_dir)


def test_rejects_unknown_fields(boards_dir: Path, board_profile_data: dict[str, Any]) -> None:
    misspelled = {**board_profile_data, "id": "other-board", "pins": "GPIO 2"}
    (boards_dir / "other-board.json").write_text(json.dumps(misspelled), encoding="utf-8")

    with pytest.raises(InvalidBoardProfileError, match="pins"):
        BoardRegistry.from_directory(boards_dir)


def test_rejects_components_on_gpios_missing_from_the_pinout(
    boards_dir: Path, board_profile_data: dict[str, Any]
) -> None:
    pinout = {"left": [{"label": "D4", "gpio": 4}], "right": [{"label": "GND"}]}
    profile = {**board_profile_data, "id": "other-board", "pinout": pinout}
    (boards_dir / "other-board.json").write_text(json.dumps(profile), encoding="utf-8")

    with pytest.raises(InvalidBoardProfileError, match="missing from the pinout"):
        BoardRegistry.from_directory(boards_dir)


def test_rejects_duplicate_board_ids(boards_dir: Path, board_profile_data: dict[str, Any]) -> None:
    (boards_dir / "copy.json").write_text(json.dumps(board_profile_data), encoding="utf-8")

    with pytest.raises(InvalidBoardProfileError, match="duplicate board id"):
        BoardRegistry.from_directory(boards_dir)


def test_empty_directory_yields_an_empty_catalog(tmp_path: Path) -> None:
    registry = BoardRegistry.from_directory(tmp_path)

    assert registry.list_boards() == []


def test_shipped_profiles_are_valid() -> None:
    registry = BoardRegistry.from_directory(DEFAULT_BOARDS_DIR)

    assert registry.get_board("esp32")
