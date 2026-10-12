"""Assembles the messages sent to the language model for one conversation turn."""

from collections.abc import Sequence
from pathlib import Path
from string import Template
from typing import Self

from app.clients.llm_client import ChatMessage
from app.schemas.board import BoardProfile

SYSTEM_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "system_prompt.txt"
# Stored with every reply so each generated code can be traced to the prompt that produced it.
# Bump it whenever system_prompt.txt or the way the profile is serialized changes.
PROMPT_VERSION = "v4"
# The header layout and the wiring instructions are for the student's board view; the model
# only needs the components and their pins, and a shorter prompt is faster to process.
PROFILE_FIELDS_LEFT_OUT_OF_PROMPT = {"pinout": True, "components": {"__all__": {"wiring"}}}


class PromptBuilder:
    """Combines the system instructions, the board profile, the history and the new request."""

    def __init__(self, template: Template) -> None:
        self._template = template

    @classmethod
    def from_file(cls, path: Path = SYSTEM_PROMPT_PATH) -> Self:
        """Build a prompt builder from a template file with ${placeholder} fields."""
        return cls(Template(path.read_text(encoding="utf-8")))

    def build(
        self, profile: BoardProfile, history: Sequence[ChatMessage], content: str
    ) -> list[ChatMessage]:
        """Return the system message, the previous messages and the new user message, in order."""
        system_message = ChatMessage(role="system", content=self._system_prompt(profile))
        return [system_message, *history, ChatMessage(role="user", content=content)]

    def _system_prompt(self, profile: BoardProfile) -> str:
        return self._template.substitute(
            board_name=profile.name,
            language=profile.language,
            framework=profile.framework,
            # Compact JSON: every token of the system prompt is re-read on each request.
            board_profile=profile.model_dump_json(exclude=PROFILE_FIELDS_LEFT_OUT_OF_PROMPT),
        )
