"""Domain exceptions raised by the services."""

from pathlib import Path


class BoardNotFoundError(Exception):
    """Raised when no hardware profile exists for the requested board id."""

    def __init__(self, board_id: str) -> None:
        super().__init__(f"Board not found: {board_id}")
        self.board_id = board_id


class InvalidBoardProfileError(Exception):
    """Raised when a hardware profile file cannot be read, parsed or validated."""

    def __init__(self, path: Path, reason: str) -> None:
        super().__init__(f"Invalid board profile {path.name}: {reason}")
        self.path = path
