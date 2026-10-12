"""Language model access: the only module that talks to Ollama."""

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal, Protocol, Self

import ollama

from app.config import Settings
from app.exceptions import LlmUnavailableError

NANOSECONDS_PER_MILLISECOND = 1_000_000
MILLISECONDS_PER_SECOND = 1_000

Role = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class ChatMessage:
    """One message of a conversation sent to the model."""

    role: Role
    content: str


@dataclass(frozen=True)
class LlmResult:
    """The model's reply and how long it took to produce it."""

    content: str
    model: str
    elapsed_ms: int
    load_ms: int
    output_tokens: int


@dataclass(frozen=True)
class GenerationOptions:
    """Sampling and memory settings applied to every request."""

    temperature: float
    context_size: int
    keep_alive: str


class LlmClient(Protocol):
    """Anything that can answer a conversation; lets tests replace the real model."""

    def chat(self, messages: list[ChatMessage]) -> LlmResult:
        """Send the conversation and return the model's reply."""
        ...


class OllamaClient:
    """LlmClient backed by an Ollama server."""

    def __init__(
        self,
        client: ollama.Client,
        model: str,
        options: GenerationOptions,
        clock: Callable[[], float] = time.perf_counter,
    ) -> None:
        self._client = client
        self._model = model
        self._options = options
        self._clock = clock

    @classmethod
    def from_settings(cls, settings: Settings) -> Self:
        """Build a client for the server, model and options in the settings."""
        options = GenerationOptions(
            temperature=settings.llm_temperature,
            context_size=settings.llm_context_size,
            keep_alive=settings.llm_keep_alive,
        )
        return cls(ollama.Client(host=settings.ollama_url), settings.ollama_model, options)

    def chat(self, messages: list[ChatMessage]) -> LlmResult:
        """Send the conversation and return the reply with its timing."""
        started_at = self._clock()
        try:
            response = self._client.chat(
                model=self._model,
                messages=_to_ollama_messages(messages),
                options={
                    "temperature": self._options.temperature,
                    "num_ctx": self._options.context_size,
                },
                keep_alive=self._options.keep_alive,
            )
        except (ConnectionError, ollama.ResponseError) as error:
            raise LlmUnavailableError(str(error)) from error
        elapsed_ms = round((self._clock() - started_at) * MILLISECONDS_PER_SECOND)

        return LlmResult(
            content=response.message.content or "",
            model=response.model or self._model,
            elapsed_ms=elapsed_ms,
            load_ms=(response.load_duration or 0) // NANOSECONDS_PER_MILLISECOND,
            output_tokens=response.eval_count or 0,
        )


def _to_ollama_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
    return [{"role": message.role, "content": message.content} for message in messages]
