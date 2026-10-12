"""Catalog of board hardware profiles loaded from JSON files."""

import logging
from pathlib import Path
from typing import Self

from pydantic import ValidationError

from app.exceptions import BoardNotFoundError, InvalidBoardProfileError
from app.schemas.board import BoardProfile

PROFILE_FILE_PATTERN = "*.json"

logger = logging.getLogger(__name__)


class BoardRegistry:
    """Read-only catalog of board profiles, indexed by board id."""

    def __init__(self, profiles: dict[str, BoardProfile]) -> None:
        self._profiles = profiles

    @classmethod
    def from_directory(cls, directory: Path) -> Self:
        """Load every profile file in the directory, failing on the first invalid one."""
        profiles: dict[str, BoardProfile] = {}
        for path in sorted(directory.glob(PROFILE_FILE_PATTERN)):
            profile = _read_profile(path)
            if profile.id in profiles:
                raise InvalidBoardProfileError(path, f"duplicate board id '{profile.id}'")
            profiles[profile.id] = profile

        if profiles:
            logger.info("Loaded %d board profile(s) from %s", len(profiles), directory)
        else:
            logger.warning("No board profiles found in %s", directory)
        return cls(profiles)

    def list_boards(self) -> list[BoardProfile]:
        """Return every profile, sorted by display name."""
        return sorted(self._profiles.values(), key=lambda profile: profile.name)

    def get_board(self, board_id: str) -> BoardProfile:
        """Return the profile with the given id, or raise BoardNotFoundError."""
        try:
            return self._profiles[board_id]
        except KeyError:
            raise BoardNotFoundError(board_id) from None


def _read_profile(path: Path) -> BoardProfile:
    try:
        return BoardProfile.model_validate_json(path.read_text(encoding="utf-8"))
    except ValidationError as error:
        raise InvalidBoardProfileError(path, str(error)) from error
