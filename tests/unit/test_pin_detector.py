"""Tests for finding the pins a sketch uses and matching them to the board's components."""

import pytest

from app.schemas.board import BoardProfile, Component, ComponentPin
from app.services.pin_detector import detect_pin_usage, find_gpios

BUTTON_ON_4 = "const int BUTTON_PIN = 4;\nvoid setup() { pinMode(BUTTON_PIN, INPUT_PULLUP); }"
BUTTON_ON_5 = "const int BUTTON_PIN = 5;\nvoid setup() { pinMode(BUTTON_PIN, INPUT_PULLUP); }"


@pytest.fixture
def profile_with_button(board_profile: BoardProfile) -> BoardProfile:
    button = Component(
        name="Botão",
        type="entrada digital",
        pins=[ComponentPin(gpio=4)],
        wiring="Um terminal no GPIO 4 e o outro no GND.",
    )
    return board_profile.model_copy(update={"components": [*board_profile.components, button]})


def test_finds_literal_pins() -> None:
    code = "void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }"

    assert find_gpios(code) == {2}


def test_resolves_named_constants_and_defines() -> None:
    code = """
    #define BUTTON_PIN 4
    const int ledPin = 27;
    static const uint8_t BUZZER = GPIO_NUM_18;
    void setup() {
      pinMode(BUTTON_PIN, INPUT_PULLUP);
      pinMode(ledPin, OUTPUT);
      tone(BUZZER, 440);
    }
    """

    assert find_gpios(code) == {4, 18, 27}


def test_resolves_every_pin_of_an_array() -> None:
    code = """
    const int leds[] = {25, 26, 27};
    void setup() {
      for (int i = 0; i < 3; i++) {
        pinMode(leds[i], OUTPUT);
      }
    }
    """

    assert find_gpios(code) == {25, 26, 27}


def test_finds_pins_given_to_libraries() -> None:
    code = """
    #define DHT_PIN 15
    DHT dht(DHT_PIN, DHT22);
    void setup() {
      Wire.begin(21, 22);
      ledcAttachPin(23, 0);
      attachInterrupt(digitalPinToInterrupt(4), onPress, FALLING);
    }
    """

    assert find_gpios(code) == {4, 15, 21, 22, 23}


def test_ignores_numbers_that_are_not_pins() -> None:
    code = """
    const int INTERVAL_MS = 500;
    void setup() { Serial.begin(115200); Wire.begin(); }
    void loop() { delay(INTERVAL_MS); analogWrite(LED_BUILTIN, 128); }
    """

    assert find_gpios(code) == set()


def test_resolves_the_board_pin_names() -> None:
    code = "void setup() { pinMode(LED_BUILTIN, OUTPUT); Wire.begin(SDA, SCL); }"

    assert find_gpios(code, {"LED_BUILTIN": 2, "SDA": 21, "SCL": 22}) == {2, 21, 22}


def test_i2c_without_pins_uses_the_board_defaults() -> None:
    code = """
    #include <Wire.h>
    Adafruit_SSD1306 display(128, 64, &Wire, -1);
    void setup() { display.begin(SSD1306_SWITCHCAPVCC, 0x3C); }
    """

    assert find_gpios(code, {"SDA": 21, "SCL": 22}) == {21, 22}


def test_code_constants_take_precedence_over_board_pin_names() -> None:
    code = "const int SDA = 33;\nconst int SCL = 32;\nvoid setup() { Wire.begin(SDA, SCL); }"

    assert find_gpios(code, {"SDA": 21, "SCL": 22}) == {32, 33}


def test_ignores_pins_mentioned_in_comments_and_strings() -> None:
    code = """
    // pinMode(5, OUTPUT) was the old wiring
    /* digitalWrite(13, HIGH); */
    void loop() { Serial.println("digitalRead(14)"); digitalRead(4); }
    """

    assert find_gpios(code) == {4}


def test_matches_used_pins_to_the_profile_components(board_profile: BoardProfile) -> None:
    button = Component(name="Botão", type="entrada digital", pins=[ComponentPin(gpio=4)])
    profile = board_profile.model_copy(update={"components": [*board_profile.components, button]})
    code = "void setup() { pinMode(4, INPUT_PULLUP); pinMode(13, OUTPUT); pinMode(12, OUTPUT); }"

    usage = detect_pin_usage(code, profile)

    assert [component.name for component in usage.components] == ["Botão"]
    assert usage.unlisted_gpios == [12, 13]


def test_message_without_code_uses_no_pins(board_profile: BoardProfile) -> None:
    usage = detect_pin_usage(None, board_profile)

    assert usage.components == []
    assert usage.unlisted_gpios == []


def test_follows_a_component_moved_to_another_pin(profile_with_button: BoardProfile) -> None:
    usage = detect_pin_usage(BUTTON_ON_5, profile_with_button, [BUTTON_ON_4])

    [button] = usage.components
    assert button.name == "Botão"
    assert button.pins[0].gpio == 5
    assert button.wiring == "Um terminal no GPIO 5 e o outro no GND."
    assert [(move.component, move.from_gpio, move.to_gpio) for move in usage.moved_pins] == [
        ("Botão", 4, 5)
    ]
    assert usage.unlisted_gpios == []


def test_without_the_earlier_version_a_new_pin_stays_unlisted(
    profile_with_button: BoardProfile,
) -> None:
    usage = detect_pin_usage(BUTTON_ON_5, profile_with_button)

    assert usage.components == []
    assert usage.unlisted_gpios == [5]


def test_a_moved_constant_wins_over_the_component_on_its_new_pin(
    profile_with_button: BoardProfile,
) -> None:
    on_led_pin = "const int BUTTON_PIN = 2;\nvoid setup() { pinMode(BUTTON_PIN, INPUT_PULLUP); }"

    usage = detect_pin_usage(on_led_pin, profile_with_button, [BUTTON_ON_4])

    assert [(component.name, component.pins[0].gpio) for component in usage.components] == [
        ("Botão", 2)
    ]


def test_pins_that_trade_places_are_renamed_in_the_wiring(board_profile: BoardProfile) -> None:
    display = Component(
        name="Display",
        type="I2C",
        pins=[ComponentPin(gpio=21, role="SDA"), ComponentPin(gpio=22, role="SCL")],
        wiring="SDA no GPIO 21 e SCL no GPIO 22.",
    )
    profile = board_profile.model_copy(update={"components": [display]})
    begin_i2c = "void setup() { Wire.begin(SDA_PIN, SCL_PIN); }"
    before = f"const int SDA_PIN = 21;\nconst int SCL_PIN = 22;\n{begin_i2c}"
    after = f"const int SDA_PIN = 22;\nconst int SCL_PIN = 21;\n{begin_i2c}"

    usage = detect_pin_usage(after, profile, [before])

    assert usage.components[0].wiring == "SDA no GPIO 22 e SCL no GPIO 21."
