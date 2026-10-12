"""Schema for the pins a generated code uses on its board."""

from pydantic import BaseModel, ConfigDict

from app.schemas.board import Component


class PinUsage(BaseModel):
    """The board components a code drives, and the GPIOs it uses that no component is wired to."""

    model_config = ConfigDict(frozen=True)

    components: list[Component]
    unlisted_gpios: list[int]
