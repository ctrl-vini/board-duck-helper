"""Schemas for conversations and their messages, shared by the API and the stored files."""

from datetime import UTC, datetime
from typing import Annotated, Literal, Self
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

CONVERSATION_ID_PATTERN = r"^[0-9a-f]{32}$"
MAX_MESSAGE_LENGTH = 4_000

MessageRole = Literal["user", "assistant"]
MessageContent = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_MESSAGE_LENGTH)
]


def _new_id() -> str:
    return uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


class ConversationCreate(BaseModel):
    """Request body to start a conversation about one board."""

    board_id: str = Field(min_length=1)


class MessageCreate(BaseModel):
    """Request body with what the student asks for."""

    content: MessageContent


class GenerationMetrics(BaseModel):
    """How a reply was produced: by which model and prompt, and how long it took."""

    model_config = ConfigDict(frozen=True)

    model: str
    elapsed_ms: int
    load_ms: int
    output_tokens: int
    prompt_version: str


class Message(BaseModel):
    """One message of a conversation; code, explanation and metrics exist only on replies."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(default_factory=_new_id)
    role: MessageRole
    content: str
    code: str | None = None
    explanation: str | None = None
    metrics: GenerationMetrics | None = None
    created_at: datetime = Field(default_factory=_now)


class Conversation(BaseModel):
    """A student's conversation about one board, with every message in order."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(default_factory=_new_id, pattern=CONVERSATION_ID_PATTERN)
    board_id: str
    created_at: datetime = Field(default_factory=_now)
    messages: list[Message] = Field(default_factory=list)

    def with_messages(self, *messages: Message) -> Self:
        """Return a copy of the conversation with the messages appended."""
        return self.model_copy(update={"messages": [*self.messages, *messages]})
