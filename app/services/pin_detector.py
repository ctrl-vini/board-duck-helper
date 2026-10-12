"""Finds the GPIOs an Arduino sketch uses and matches them to the components of its board.

The prompt asks the model to declare each pin as a named constant and to use only the pins of
the profile, so reading the pin arguments of the usual calls is enough. Names the board's core
predefines (LED_BUILTIN, SDA, SCL) come from the profile; pins computed at run time are not found.
"""

import re
from collections.abc import Mapping

from app.schemas.board import BoardProfile
from app.schemas.pin_usage import PinUsage

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
NAME_OR_ELEMENT = re.compile(r"(?P<name>[A-Za-z_]\w*)(?:\s*\[.*\])?")


def detect_pin_usage(code: str | None, profile: BoardProfile) -> PinUsage:
    """Return the profile's components the code drives and the GPIOs it uses outside them."""
    gpios = find_gpios(code or "", profile.pin_names)
    wired = {pin.gpio for component in profile.components for pin in component.pins}
    components = [
        component
        for component in profile.components
        if any(pin.gpio in gpios for pin in component.pins)
    ]
    return PinUsage(components=components, unlisted_gpios=sorted(gpios - wired))


def find_gpios(code: str, pin_names: Mapping[str, int] | None = None) -> set[int]:
    """Return every GPIO the code passes to a pin function or to a library object.

    pin_names are the board's predefined pin names; the code's own constants take precedence.
    """
    source = COMMENT_OR_STRING.sub(" ", code)
    constants = {name: {gpio} for name, gpio in (pin_names or {}).items()}
    constants.update(_find_constants(source))
    gpios: set[int] = set()
    if I2C_BUS.search(source) and not I2C_PINS_GIVEN.search(source):
        for name in DEFAULT_I2C_PIN_NAMES:
            gpios |= constants.get(name, set())
    for pattern, positions_by_callee in (
        (FUNCTION_CALL, PIN_ARGUMENTS_BY_FUNCTION),
        (CONSTRUCTOR_CALL, PIN_ARGUMENTS_BY_CONSTRUCTOR),
    ):
        for match in pattern.finditer(source):
            arguments = _call_arguments(source, match.end())
            for position in positions_by_callee[match.group("callee")]:
                if position < len(arguments):
                    gpios |= _resolve(arguments[position], constants)
    return gpios


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


def _resolve(argument: str, constants: dict[str, set[int]]) -> set[int]:
    """Turn a pin argument into GPIO numbers: a literal, a named constant or an array element."""
    expression = CAST_PREFIX.sub("", argument)
    if re.fullmatch(PIN_VALUE, expression):
        return {_pin_number(expression)}
    match = NAME_OR_ELEMENT.fullmatch(expression)
    if match is None:
        return set()
    return constants.get(match.group("name"), set())


def _pin_number(value: str) -> int:
    return int(value.removeprefix("GPIO_NUM_"))
