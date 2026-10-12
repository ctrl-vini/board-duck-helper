"""Schemas for board hardware profiles."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

BOARD_ID_PATTERN = r"^[a-z0-9][a-z0-9-]*$"
# The board drawing has 12 columns inside: a pin hole at each edge, then a space on each side
# of its label.
BOARD_LABEL_MAX_LENGTH = 8

# How the interface names a pin in its messages: "GPIO 13", or the header label, such as "D13".
PinNaming = Literal["gpio", "label"]

# What a component is, so the board view can draw it; one drawing exists for each kind.
ComponentKind = Literal["led", "button", "buzzer", "dht22", "potentiometer", "oled", "relay"]


class ProfileModel(BaseModel):
    """Base for profile parts: immutable, and unknown keys are rejected to catch typos."""

    model_config = ConfigDict(extra="forbid", frozen=True)


class ComponentPin(ProfileModel):
    """A GPIO used by a component, with its role when the component uses several (e.g. SDA)."""

    gpio: int = Field(ge=0)
    role: str | None = None


class Component(ProfileModel):
    """A peripheral wired to the board: the pins it uses and how to connect it."""

    name: str = Field(min_length=1)
    type: str = Field(min_length=1)
    kind: ComponentKind | None = None
    pins: list[ComponentPin] = Field(min_length=1)
    wiring: str | None = None


class HeaderPin(ProfileModel):
    """One pin of the board's header; gpio is empty for power and ground pins.

    Pins nearly every circuit uses, such as GND and 3V3, get a short note drawn beside them and a
    description of what they are for, shown while no code says what else to wire.
    """

    label: str = Field(min_length=1)
    gpio: int | None = Field(default=None, ge=0)
    note: str | None = None
    description: str | None = None


class Pinout(ProfileModel):
    """Physical order of the header pins on each side, used to draw the board for students.

    label is written in the middle of the drawing, such as the board's name.
    """

    label: str | None = Field(default=None, max_length=BOARD_LABEL_MAX_LENGTH)
    caption: str | None = None
    left: list[HeaderPin] = Field(min_length=1)
    right: list[HeaderPin] = Field(min_length=1)

    def gpios(self) -> set[int]:
        """Every GPIO number available on the header."""
        return {pin.gpio for pin in (*self.left, *self.right) if pin.gpio is not None}

    def labels(self) -> set[str]:
        """Every label printed on the header."""
        return {pin.label for pin in (*self.left, *self.right)}


class SupplyPins(ProfileModel):
    """Header labels of the pins the component drawings take power from.

    logic is at the voltage of the GPIOs, for sensors and displays; five_volt powers 5 V modules
    such as relays; ground is the negative.
    """

    logic: str = Field(min_length=1)
    five_volt: str = Field(min_length=1)
    ground: str = Field(min_length=1)


class BoardProfile(ProfileModel):
    """Full hardware description of a board, used as model context and shown to students."""

    id: str = Field(pattern=BOARD_ID_PATTERN)
    name: str = Field(min_length=1)
    microcontroller: str = Field(min_length=1)
    language: str = Field(min_length=1)
    framework: str = Field(min_length=1)
    # The board to pick in the Arduino IDE's menu, shown to students; the wrong one can leave
    # names such as LED_BUILTIN undefined.
    ide_board: str | None = None
    components: list[Component] = Field(min_length=1)
    notes: list[str] = Field(default_factory=list)
    pinout: Pinout | None = None
    # Names the board's Arduino core predefines for some pins, such as LED_BUILTIN, A0, SDA and
    # SCL, so the pins of generated code that uses them can be found.
    pin_names: dict[str, int] = Field(default_factory=dict)
    pin_naming: PinNaming = "gpio"
    supply_pins: SupplyPins | None = None

    @model_validator(mode="after")
    def check_component_pins_exist(self) -> Self:
        """Every GPIO a component uses must exist on the header, when the layout is given."""
        if self.pinout is None:
            return self
        used = {pin.gpio for component in self.components for pin in component.pins}
        missing = sorted(used - self.pinout.gpios())
        if missing:
            raise ValueError(f"components use GPIOs missing from the pinout: {missing}")
        return self

    @model_validator(mode="after")
    def check_supply_pins_exist(self) -> Self:
        """The supply pins must be on the header, when the layout is given."""
        if self.pinout is None or self.supply_pins is None:
            return self
        supply_labels = {
            self.supply_pins.logic,
            self.supply_pins.five_volt,
            self.supply_pins.ground,
        }
        missing = sorted(supply_labels - self.pinout.labels())
        if missing:
            raise ValueError(f"supply pins missing from the pinout: {missing}")
        return self


class BoardSummary(BaseModel):
    """Board entry in the board list."""

    id: str
    name: str
    microcontroller: str

    @classmethod
    def from_profile(cls, profile: BoardProfile) -> Self:
        """Build the list entry from a full profile."""
        return cls(id=profile.id, name=profile.name, microcontroller=profile.microcontroller)
