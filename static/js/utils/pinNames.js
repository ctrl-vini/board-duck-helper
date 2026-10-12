import { UI_TEXT } from "../ui-text.js";

/**
 * How the interface refers to the pins of a board. name() is used in messages: "GPIO 13" on
 * boards known by GPIO number, such as the ESP32, or the header label, such as "D13" or "A0",
 * on the Arduino boards. label() is always the header label, as printed in the board drawing.
 */
export function createPinNames(profile) {
  const header = profile.pinout ? [...profile.pinout.left, ...profile.pinout.right] : [];
  const labels = new Map(
    header
      .filter((pin) => pin.gpio !== undefined && pin.gpio !== null)
      .map((pin) => [pin.gpio, pin.label]),
  );
  const name =
    profile.pin_naming === "label"
      ? (gpio) => labels.get(gpio) ?? UI_TEXT.digitalPinName(gpio)
      : UI_TEXT.gpioName;
  return { name, label: (gpio) => labels.get(gpio) ?? name(gpio) };
}
