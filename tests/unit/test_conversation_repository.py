"""Tests for storing conversations as JSON files."""

from pathlib import Path

import pytest

from app.exceptions import ConversationNotFoundError
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import Message


@pytest.fixture
def repository(tmp_path: Path) -> ConversationRepository:
    return ConversationRepository(tmp_path / "conversations")


def test_created_conversation_can_be_read_back(repository: ConversationRepository) -> None:
    created = repository.create("esp32")

    assert repository.get(created.id) == created


def test_saved_messages_are_persisted(repository: ConversationRepository) -> None:
    conversation = repository.create("esp32")
    message = Message(role="user", content="Pisque o LED")

    repository.save(conversation.with_messages(message))

    assert repository.get(conversation.id).messages == [message]


def test_save_leaves_only_the_final_file(
    repository: ConversationRepository, tmp_path: Path
) -> None:
    conversation = repository.create("esp32")

    assert [path.name for path in (tmp_path / "conversations").iterdir()] == [
        f"{conversation.id}.json"
    ]


def test_unknown_id_is_not_found(repository: ConversationRepository) -> None:
    with pytest.raises(ConversationNotFoundError):
        repository.get("0" * 32)


@pytest.mark.parametrize("conversation_id", ["..", "../secrets", "ABC", ""])
def test_malformed_ids_are_rejected(
    repository: ConversationRepository, conversation_id: str
) -> None:
    with pytest.raises(ConversationNotFoundError):
        repository.get(conversation_id)
