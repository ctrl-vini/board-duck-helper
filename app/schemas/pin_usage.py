"""Schema for the pins a generated code uses on its board."""

from pydantic import BaseModel, ConfigDict

from app.schemas.board import Component


class PinMove(BaseModel):
    """A component pin the code wires to another GPIO than the profile does."""

    model_config = ConfigDict(frozen=True)

    component: str
    role: str | None
    from_gpio: int
    to_gpio: int


class PinUsage(BaseModel):
    """The board components a code drives, wired as it needs them, and the GPIOs it uses that no
    component is wired to."""

    model_config = ConfigDict(frozen=True)

    components: list[Component]
    moved_pins: list[PinMove]
    unlisted_gpios: list[int]
