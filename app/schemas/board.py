"""Schemas for board hardware profiles."""

from typing import Self

from pydantic import BaseModel, ConfigDict, Field

BOARD_ID_PATTERN = r"^[a-z0-9][a-z0-9-]*$"


class Component(BaseModel):
    """A peripheral wired to the board and the pin it uses."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1)
    type: str = Field(min_length=1)
    pin: str = Field(min_length=1)


class BoardProfile(BaseModel):
    """Full hardware description of a board, used as context for the language model."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(pattern=BOARD_ID_PATTERN)
    name: str = Field(min_length=1)
    microcontroller: str = Field(min_length=1)
    language: str = Field(min_length=1)
    framework: str = Field(min_length=1)
    components: list[Component] = Field(min_length=1)
    notes: list[str] = Field(default_factory=list)


class BoardSummary(BaseModel):
    """Public view of a board; the full profile never leaves the server."""

    id: str
    name: str
    microcontroller: str

    @classmethod
    def from_profile(cls, profile: BoardProfile) -> Self:
        """Build the public view from a full profile."""
        return cls(id=profile.id, name=profile.name, microcontroller=profile.microcontroller)
