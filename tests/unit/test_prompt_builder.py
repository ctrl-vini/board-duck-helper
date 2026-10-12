"""Tests for assembling the messages sent to the model."""

from string import Template

from app.clients.llm_client import ChatMessage
from app.schemas.board import BoardProfile
from app.services.prompt_builder import PromptBuilder

TEMPLATE = Template("Board ${board_name} in ${language} for ${framework}.\n${board_profile}")


def test_messages_are_system_then_history_then_request(board_profile: BoardProfile) -> None:
    history = [
        ChatMessage(role="user", content="Blink the LED"),
        ChatMessage(role="assistant", content="```cpp\nvoid setup() {}\n```"),
    ]

    messages = PromptBuilder(TEMPLATE).build(board_profile, history, "Make it faster")

    assert [message.role for message in messages] == ["system", "user", "assistant", "user"]
    assert messages[1:3] == history
    assert messages[-1].content == "Make it faster"


def test_system_message_describes_the_board(board_profile: BoardProfile) -> None:
    system_message = PromptBuilder(TEMPLATE).build(board_profile, [], "Blink the LED")[0]

    assert "Board Test Board in C++ for Arduino." in system_message.content
    assert '"pin":"GPIO 2"' in system_message.content
    assert "Example note" in system_message.content


def test_first_request_has_no_history(board_profile: BoardProfile) -> None:
    messages = PromptBuilder(TEMPLATE).build(board_profile, [], "Blink the LED")

    assert [message.role for message in messages] == ["system", "user"]


def test_shipped_template_fills_every_placeholder(board_profile: BoardProfile) -> None:
    system_message = PromptBuilder.from_file().build(board_profile, [], "Blink the LED")[0]

    assert "${" not in system_message.content
    assert "Test Board" in system_message.content
