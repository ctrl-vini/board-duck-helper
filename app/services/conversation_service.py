"""Conversation use cases: start a conversation, send a message, read the history and pins."""

import logging
from collections.abc import Sequence

from app.clients.llm_client import ChatMessage, LlmClient, LlmResult
from app.exceptions import MessageNotFoundError
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import Conversation, GenerationMetrics, Message
from app.schemas.pin_usage import PinUsage
from app.services.board_registry import BoardRegistry
from app.services.pin_detector import detect_pin_usage
from app.services.prompt_builder import PROMPT_VERSION, PromptBuilder
from app.services.response_parser import parse_response

logger = logging.getLogger(__name__)


class ConversationService:
    """Runs each conversation turn: builds the prompt, asks the model and records the exchange."""

    def __init__(
        self,
        boards: BoardRegistry,
        conversations: ConversationRepository,
        prompt_builder: PromptBuilder,
        llm_client: LlmClient,
    ) -> None:
        self._boards = boards
        self._conversations = conversations
        self._prompt_builder = prompt_builder
        self._llm_client = llm_client

    def start(self, board_id: str) -> Conversation:
        """Create an empty conversation for an existing board."""
        self._boards.get_board(board_id)
        return self._conversations.create(board_id)

    def get(self, conversation_id: str) -> Conversation:
        """Return the conversation with every message."""
        return self._conversations.get(conversation_id)

    def send_message(self, conversation_id: str, content: str) -> Message:
        """Ask the model and store both messages; nothing is stored if the model fails."""
        conversation = self._conversations.get(conversation_id)
        profile = self._boards.get_board(conversation.board_id)

        history = _to_chat_history(conversation.messages)
        result = self._llm_client.chat(self._prompt_builder.build(profile, history, content))
        logger.info(
            "Reply for conversation %s in %d ms (%s)",
            conversation.id,
            result.elapsed_ms,
            result.model,
        )

        reply = _reply_from(result)
        user_message = Message(role="user", content=content)
        self._conversations.save(conversation.with_messages(user_message, reply))
        return reply

    def get_pin_usage(self, conversation_id: str, message_id: str) -> PinUsage:
        """Return which of the board's components the code of one message uses, and where.

        The earlier versions of the code tell which component a constant stands for, so one the
        student asked to move to another pin is still recognized.
        """
        conversation = self._conversations.get(conversation_id)
        position = _position_of(conversation, message_id)
        earlier_codes = [
            message.code for message in conversation.messages[:position] if message.code
        ]
        profile = self._boards.get_board(conversation.board_id)
        return detect_pin_usage(conversation.messages[position].code, profile, earlier_codes)


def _position_of(conversation: Conversation, message_id: str) -> int:
    for position, message in enumerate(conversation.messages):
        if message.id == message_id:
            return position
    raise MessageNotFoundError(message_id)


def _to_chat_history(messages: Sequence[Message]) -> list[ChatMessage]:
    return [ChatMessage(role=message.role, content=message.content) for message in messages]


def _reply_from(result: LlmResult) -> Message:
    parsed = parse_response(result.content)
    metrics = GenerationMetrics(
        model=result.model,
        elapsed_ms=result.elapsed_ms,
        load_ms=result.load_ms,
        output_tokens=result.output_tokens,
        prompt_version=PROMPT_VERSION,
    )
    return Message(
        role="assistant",
        content=result.content,
        code=parsed.code,
        explanation=parsed.explanation,
        metrics=metrics,
    )
