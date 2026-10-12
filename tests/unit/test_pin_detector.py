"""Tests for finding the pins a sketch uses and matching them to the board's components."""

from app.schemas.board import BoardProfile, Component, ComponentPin
from app.services.pin_detector import detect_pin_usage, find_gpios


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
