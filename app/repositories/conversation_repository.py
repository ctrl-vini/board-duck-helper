"""Stores each conversation as one JSON file."""

import re
from pathlib import Path

from app.exceptions import ConversationNotFoundError
from app.schemas.conversation import CONVERSATION_ID_PATTERN, Conversation

FILE_SUFFIX = ".json"
TEMPORARY_SUFFIX = ".json.tmp"
JSON_INDENT = 2


class ConversationRepository:
    """Reads and writes conversations in a directory, one file per conversation."""

    def __init__(self, directory: Path) -> None:
        self._directory = directory

    def create(self, board_id: str) -> Conversation:
        """Create and store an empty conversation for the board."""
        conversation = Conversation(board_id=board_id)
        self.save(conversation)
        return conversation

    def get(self, conversation_id: str) -> Conversation:
        """Load a conversation, or raise ConversationNotFoundError."""
        path = self._path_for(conversation_id)
        if not path.is_file():
            raise ConversationNotFoundError(conversation_id)
        return Conversation.model_validate_json(path.read_text(encoding="utf-8"))

    def save(self, conversation: Conversation) -> None:
        """Write the whole conversation, replacing the previous version atomically."""
        self._directory.mkdir(parents=True, exist_ok=True)
        path = self._path_for(conversation.id)
        # Write then rename, so a crash never leaves a half-written file.
        temporary_path = path.with_suffix(TEMPORARY_SUFFIX)
        serialized = conversation.model_dump_json(indent=JSON_INDENT)
        temporary_path.write_text(serialized, encoding="utf-8")
        temporary_path.replace(path)

    def _path_for(self, conversation_id: str) -> Path:
        # Ids come from URLs, so anything outside the expected format is rejected before it
        # can be used to build a file path.
        if not re.fullmatch(CONVERSATION_ID_PATTERN, conversation_id):
            raise ConversationNotFoundError(conversation_id)
        return self._directory / f"{conversation_id}{FILE_SUFFIX}"
