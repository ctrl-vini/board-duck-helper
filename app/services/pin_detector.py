"""Finds the GPIOs an Arduino sketch uses and matches them to the components of its board.

The prompt asks the model to declare each pin as a named constant and to use only the pins of
the profile, so reading the pin arguments of the usual calls is enough. Names the board's core
predefines (LED_BUILTIN, SDA, SCL) come from the profile; pins computed at run time are not found.

A component can still move: asked to "use outro pino, esse está quebrado", the model keeps the
constant and changes its number. So a constant that pointed at a component in an earlier version
keeps naming that component, now on its new GPIO.
"""

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from app.schemas.board import BoardProfile, Component
from app.schemas.pin_usage import PinMove, PinUsage

# Comments and string literals may mention pins ("LED no GPIO 4") without using them.
COMMENT_OR_STRING = re.compile(
    r'//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'', re.DOTALL
)
INTEGER_TYPE = r"(?:int|unsigned|short|long|byte|size_t|gpio_num_t|u?int(?:8|16|32)_t)"
PIN_VALUE = r"(?:\d+|GPIO_NUM_\d+)"
DEFINED_CONSTANT = re.compile(
    rf"^\s*#\s*define\s+(?P<name>\w+)\s+\(?(?P<value>{PIN_VALUE})\)?\s*$", re.MULTILINE
)
DECLARED_CONSTANT = re.compile(
    rf"\b{INTEGER_TYPE}\s+(?P<name>\w+)\s*=\s*(?P<value>{PIN_VALUE})\s*[;,)]"
)
DECLARED_ARRAY = re.compile(
    rf"\b{INTEGER_TYPE}\s+(?P<name>\w+)\s*\[[^\]]*\]\s*=\s*\{{(?P<values>[^}}]*)\}}"
)
# Argument positions that hold a pin, for each call that takes one.
PIN_ARGUMENTS_BY_FUNCTION: dict[str, tuple[int, ...]] = {
    "pinMode": (0,),
    "digitalWrite": (0,),
    "digitalRead": (0,),
    "analogRead": (0,),
    "analogReadMilliVolts": (0,),
    "analogWrite": (0,),
    "dacWrite": (0,),
    "touchRead": (0,),
    "touchAttachInterrupt": (0,),
    "attachInterrupt": (0,),
    "detachInterrupt": (0,),
    "digitalPinToInterrupt": (0,),
    "pulseIn": (0,),
    "tone": (0,),
    "noTone": (0,),
    "ledcAttach": (0,),
    "ledcAttachPin": (0,),
    "ledcAttachChannel": (0,),
    "ledcDetach": (0,),
    "shiftIn": (0, 1),
    "shiftOut": (0, 1),
    "Wire.begin": (0, 1),
    "Wire1.begin": (0, 1),
}
# Library objects created with their pin, as in "DHT dht(DHT_PIN, DHT22);".
PIN_ARGUMENTS_BY_CONSTRUCTOR: dict[str, tuple[int, ...]] = {
    "DHT": (0,),
    "DHT_Unified": (0,),
    "OneWire": (0,),
    "Adafruit_NeoPixel": (1,),
}
FUNCTION_CALL = re.compile(
    r"(?<![\w.])(?P<callee>"
    + "|".join(re.escape(name) for name in PIN_ARGUMENTS_BY_FUNCTION)
    + r")\s*\("
)
CONSTRUCTOR_CALL = re.compile(
    r"(?<![\w.])(?P<callee>"
    + "|".join(re.escape(name) for name in PIN_ARGUMENTS_BY_CONSTRUCTOR)
    + r")\s+\w+\s*\("
)
# I2C code that never passes pins to Wire.begin, as in the display library examples, runs on
# the board's default SDA and SCL pins.
I2C_BUS = re.compile(r"\bWire\b")
I2C_PINS_GIVEN = re.compile(r"\bWire\.begin\s*\(\s*[^\s)]")
DEFAULT_I2C_PIN_NAMES = ("SDA", "SCL")
CAST_PREFIX = re.compile(r"^\(\s*\w+\s*\)\s*")
NAME_OR_ELEMENT = re.compile(r"(?P<name>[A-Za-z_]\w*)(?P<element>\s*\[.*\])?")
# How wiring texts refer to a pin, so a moved pin can be renamed in them.
GPIO_MENTION = re.compile(r"\bGPIO (\d+)\b")

# A component pin of the profile: (index of the component, index of the pin).
Slot = tuple[int, int]


@dataclass(frozen=True)
class PinUse:
    """A GPIO the code passes as a pin, and the constant it came from when it has one value."""

    gpio: int
    name: str | None = None


@dataclass(frozen=True)
class Placement:
    """Where one code version puts the profile's component pins, and the GPIOs left over."""

    gpio_by_slot: dict[Slot, int]
    slot_by_name: dict[str, Slot]
    unlisted_gpios: set[int]


def detect_pin_usage(
    code: str | None, profile: BoardProfile, earlier_codes: Sequence[str] = ()
) -> PinUsage:
    """Return the profile's components the code drives, wired as the code needs them.

    earlier_codes are the previous versions of the conversation, oldest first: a constant that
    named a component there still names it when the code gives it another GPIO. GPIOs that no
    component explains are listed apart.
    """
    slot_by_name: dict[str, Slot] = {}
    for earlier_code in earlier_codes:
        slot_by_name = _place(earlier_code, profile, slot_by_name).slot_by_name
    placement = _place(code or "", profile, slot_by_name)

    components: list[Component] = []
    moves: list[PinMove] = []
    for component_index, component in enumerate(profile.components):
        gpio_by_pin = {
            pin_index: gpio
            for (index, pin_index), gpio in placement.gpio_by_slot.items()
            if index == component_index
        }
        if gpio_by_pin:
            moved = _move_pins(component, gpio_by_pin)
            components.append(moved)
            moves += _moves_between(component, moved)
    return PinUsage(
        components=components,
        moved_pins=moves,
        unlisted_gpios=sorted(placement.unlisted_gpios),
    )


def find_gpios(code: str, pin_names: Mapping[str, int] | None = None) -> set[int]:
    """Return every GPIO the code passes to a pin function or to a library object.

    pin_names are the board's predefined pin names; the code's own constants take precedence.
    """
    return {use.gpio for use in _pin_uses(code, pin_names)}


def _place(code: str, profile: BoardProfile, known_names: Mapping[str, Slot]) -> Placement:
    """Match each pin the code uses to a component pin: by its constant, then by its GPIO."""
    slot_by_gpio = {
        pin.gpio: (component_index, pin_index)
        for component_index, component in enumerate(profile.components)
        for pin_index, pin in enumerate(component.pins)
    }
    gpio_by_slot: dict[Slot, int] = {}
    slot_by_name = dict(known_names)
    unlisted_gpios: set[int] = set()
    for use in _pin_uses(code, profile.pin_names):
        slot = known_names.get(use.name) if use.name else None
        if slot is None:
            slot = slot_by_gpio.get(use.gpio)
        if slot is None:
            unlisted_gpios.add(use.gpio)
            continue
        gpio_by_slot[slot] = use.gpio
        if use.name:
            slot_by_name[use.name] = slot
    return Placement(gpio_by_slot, slot_by_name, unlisted_gpios)


def _move_pins(component: Component, gpio_by_pin: Mapping[int, int]) -> Component:
    """The component wired to the GPIOs the code uses, with its wiring text to match."""
    pins = [
        pin.model_copy(update={"gpio": gpio_by_pin.get(index, pin.gpio)})
        for index, pin in enumerate(component.pins)
    ]
    new_gpio_by_old = {
        old.gpio: new.gpio for old, new in zip(component.pins, pins, strict=True) if old != new
    }
    wiring = component.wiring
    if wiring and new_gpio_by_old:
        # One pass, so two pins that trade places are both renamed correctly.
        wiring = GPIO_MENTION.sub(
            lambda match: f"GPIO {new_gpio_by_old.get(int(match.group(1)), match.group(1))}",
            wiring,
        )
    return component.model_copy(update={"pins": pins, "wiring": wiring})


def _moves_between(original: Component, moved: Component) -> list[PinMove]:
    return [
        PinMove(component=original.name, role=old.role, from_gpio=old.gpio, to_gpio=new.gpio)
        for old, new in zip(original.pins, moved.pins, strict=True)
        if old.gpio != new.gpio
    ]


def _pin_uses(code: str, pin_names: Mapping[str, int] | None) -> list[PinUse]:
    """Every pin argument of the code, resolved to GPIOs, in the order the code passes them."""
    source = COMMENT_OR_STRING.sub(" ", code)
    constants = {name: {gpio} for name, gpio in (pin_names or {}).items()}
    constants.update(_find_constants(source))
    uses: list[PinUse] = []
    if I2C_BUS.search(source) and not I2C_PINS_GIVEN.search(source):
        for name in DEFAULT_I2C_PIN_NAMES:
            uses += [PinUse(gpio, name) for gpio in constants.get(name, set())]
    for pattern, positions_by_callee in (
        (FUNCTION_CALL, PIN_ARGUMENTS_BY_FUNCTION),
        (CONSTRUCTOR_CALL, PIN_ARGUMENTS_BY_CONSTRUCTOR),
    ):
        for match in pattern.finditer(source):
            arguments = _call_arguments(source, match.end())
            for position in positions_by_callee[match.group("callee")]:
                if position < len(arguments):
                    uses += _resolve(arguments[position], constants)
    return uses


def _find_constants(source: str) -> dict[str, set[int]]:
    """Map each name given a pin-like value, by #define or declaration, to its values."""
    constants: dict[str, set[int]] = {}
    for match in (*DEFINED_CONSTANT.finditer(source), *DECLARED_CONSTANT.finditer(source)):
        constants.setdefault(match.group("name"), set()).add(_pin_number(match.group("value")))
    for match in DECLARED_ARRAY.finditer(source):
        values = {
            _pin_number(value.strip())
            for value in match.group("values").split(",")
            if re.fullmatch(PIN_VALUE, value.strip())
        }
        constants.setdefault(match.group("name"), set()).update(values)
    return constants


def _call_arguments(source: str, start: int) -> list[str]:
    """Split a call's arguments, reading from just after its opening parenthesis."""
    arguments: list[str] = []
    depth = 0
    argument_start = start
    for index in range(start, len(source)):
        character = source[index]
        if character in "([{":
            depth += 1
        elif character in ")]}" and depth > 0:
            depth -= 1
        elif character == ")" or (character == "," and depth == 0):
            arguments.append(source[argument_start:index].strip())
            if character == ")":
                break
            argument_start = index + 1
    return arguments


def _resolve(argument: str, constants: dict[str, set[int]]) -> list[PinUse]:
    """Turn a pin argument into GPIO numbers: a literal, a named constant or an array element."""
    expression = CAST_PREFIX.sub("", argument)
    if re.fullmatch(PIN_VALUE, expression):
        return [PinUse(_pin_number(expression))]
    match = NAME_OR_ELEMENT.fullmatch(expression)
    if match is None:
        return []
    values = constants.get(match.group("name"), set())
    # Only a constant with a single value stands for one component; an array holds several.
    name = match.group("name") if len(values) == 1 and match.group("element") is None else None
    return [PinUse(gpio, name) for gpio in sorted(values)]


def _pin_number(value: str) -> int:
    return int(value.removeprefix("GPIO_NUM_"))
