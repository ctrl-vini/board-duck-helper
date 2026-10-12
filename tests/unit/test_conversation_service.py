"""Tests for the conversation use cases."""

from pathlib import Path

import pytest

from app.exceptions import BoardNotFoundError, LlmUnavailableError, MessageNotFoundError
from app.repositories.conversation_repository import ConversationRepository
from app.services.board_registry import BoardRegistry
from app.services.conversation_service import ConversationService
from app.services.prompt_builder import PROMPT_VERSION, PromptBuilder
from tests.fakes import FakeLlmClient


@pytest.fixture
def service(boards_dir: Path, tmp_path: Path, llm_client: FakeLlmClient) -> ConversationService:
    return ConversationService(
        boards=BoardRegistry.from_directory(boards_dir),
        conversations=ConversationRepository(tmp_path / "conversations"),
        prompt_builder=PromptBuilder.from_file(),
        llm_client=llm_client,
    )


def test_start_rejects_unknown_boards(service: ConversationService) -> None:
    with pytest.raises(BoardNotFoundError):
        service.start("missing-board")


def test_reply_carries_code_explanation_and_metrics(service: ConversationService) -> None:
    conversation = service.start("test-board")

    reply = service.send_message(conversation.id, "Pisque o LED")

    assert reply.role == "assistant"
    assert reply.code == "void setup() {}\nvoid loop() {}"
    assert reply.explanation == "O código não faz nada."
    assert reply.metrics is not None
    assert reply.metrics.model == "fake-model"
    assert reply.metrics.prompt_version == PROMPT_VERSION


def test_both_messages_are_stored_in_order(service: ConversationService) -> None:
    conversation = service.start("test-board")

    reply = service.send_message(conversation.id, "Pisque o LED")

    messages = service.get(conversation.id).messages
    assert [(message.role, message.content) for message in messages] == [
        ("user", "Pisque o LED"),
        ("assistant", reply.content),
    ]


def test_follow_up_sends_the_previous_messages(
    service: ConversationService, llm_client: FakeLlmClient
) -> None:
    conversation = service.start("test-board")
    service.send_message(conversation.id, "Pisque o LED")

    service.send_message(conversation.id, "Agora mais rápido")

    second_prompt = llm_client.received[1]
    assert [message.role for message in second_prompt] == ["system", "user", "assistant", "user"]
    assert second_prompt[1].content == "Pisque o LED"
    assert second_prompt[-1].content == "Agora mais rápido"


def test_nothing_is_stored_when_the_model_fails(
    service: ConversationService, llm_client: FakeLlmClient
) -> None:
    conversation = service.start("test-board")
    llm_client.error = LlmUnavailableError("Ollama is down")

    with pytest.raises(LlmUnavailableError):
        service.send_message(conversation.id, "Pisque o LED")

    assert service.get(conversation.id).messages == []


def test_pin_usage_lists_the_components_the_reply_code_uses(
    service: ConversationService, llm_client: FakeLlmClient
) -> None:
    conversation = service.start("test-board")
    llm_client.reply = (
        "```cpp\nconst int LED_PIN = 2;\nvoid setup() { pinMode(LED_PIN, OUTPUT); }\n```"
    )
    reply = service.send_message(conversation.id, "Pisque o LED")

    usage = service.get_pin_usage(conversation.id, reply.id)

    assert [component.name for component in usage.components] == ["LED"]
    assert usage.unlisted_gpios == []


def test_pin_usage_rejects_unknown_messages(service: ConversationService) -> None:
    conversation = service.start("test-board")

    with pytest.raises(MessageNotFoundError):
        service.get_pin_usage(conversation.id, "0" * 32)


def test_pin_usage_follows_a_pin_moved_in_a_later_version(
    service: ConversationService, llm_client: FakeLlmClient
) -> None:
    conversation = service.start("test-board")
    llm_client.reply = (
        "```cpp\nconst int LED_PIN = 2;\nvoid setup() { pinMode(LED_PIN, OUTPUT); }\n```"
    )
    service.send_message(conversation.id, "Pisque o LED")
    llm_client.reply = (
        "```cpp\nconst int LED_PIN = 13;\nvoid setup() { pinMode(LED_PIN, OUTPUT); }\n```"
    )
    reply = service.send_message(conversation.id, "Use outro pino, esse está quebrado")

    usage = service.get_pin_usage(conversation.id, reply.id)

    assert [(component.name, component.pins[0].gpio) for component in usage.components] == [
        ("LED", 13)
    ]
    assert usage.unlisted_gpios == []
