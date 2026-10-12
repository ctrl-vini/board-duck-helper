import { UI_TEXT } from "../ui-text.js";

// Board pins the power legs go to: the ESP32 DevKit header labels, which its wiring texts use.
const SUPPLY = "3V3";
const GROUND = "GND";
const EXTERNAL_SUPPLY = "VIN";
const GPIO_CLASS = "component-drawing__gpio";
const LEG_SPACING = 3;
// Spaces between the text inside the body and each side of the box.
const BODY_MARGIN = 2;

/**
 * For each component kind: the symbol drawn on its body and its legs, from left to right. A leg
 * goes to a power pin (to) or to one of the component's GPIOs (signal), matched by role when it
 * has several; via is a part in between. Leg names and labels are in UI_TEXT.componentDrawing.
 */
const DRAWINGS = {
  led: {
    symbol: "▶┃↗",
    legs: [
      { leg: "anode", signal: true, via: "resistor" },
      { leg: "cathode", to: GROUND },
    ],
  },
  button: {
    symbol: "◦─⊤─◦",
    legs: [
      { leg: "terminal", signal: true },
      { leg: "terminal", to: GROUND },
    ],
  },
  buzzer: {
    symbol: "≋◎≋",
    legs: [
      { leg: "positive", signal: true },
      { leg: "negative", to: GROUND },
    ],
  },
  dht22: {
    symbol: "▒▒▒▒▒",
    legs: [
      { leg: "vcc", to: SUPPLY },
      { leg: "data", signal: true },
      { leg: "gnd", to: GROUND },
    ],
  },
  potentiometer: {
    symbol: "◔",
    legs: [
      { leg: "end", to: SUPPLY },
      { leg: "wiper", signal: true },
      { leg: "end", to: GROUND },
    ],
  },
  oled: {
    symbol: "░░░░░░░░",
    legs: [
      { leg: "gnd", to: GROUND },
      { leg: "vcc", to: SUPPLY },
      { leg: "scl", signal: true, role: "SCL" },
      { leg: "sda", signal: true, role: "SDA" },
    ],
  },
  relay: {
    symbol: "═╪═",
    legs: [
      { leg: "vcc", to: EXTERNAL_SUPPLY },
      { leg: "gnd", to: GROUND },
      { leg: "in", signal: true },
    ],
  },
};

/**
 * Draw a component as a box with its legs below it, each one led to the board pin it connects
 * to. pinLabel names a GPIO as printed on the board. Returns lines of [text, className] segments,
 * or null for a component without a kind.
 *
 *   ┌─────────┐
 *   │  ▒▒▒▒▒  │
 *   │  DHT22  │
 *   └─┬──┬──┬─┘
 *     │  │  └─── GND  → GND
 *     │  └────── DATA → D15
 *     └───────── VCC  → 3V3
 */
export function drawComponent(component, pinLabel) {
  const drawing = DRAWINGS[component.kind];
  if (!drawing) {
    return null;
  }
  const legs = describeLegs(drawing.legs, component.pins, pinLabel);
  const body = [drawing.symbol, UI_TEXT.componentDrawing.labels[component.kind]];

  const legSpan = LEG_SPACING * (legs.length - 1) + 1;
  const minimumWidth = Math.max(legSpan + 2, ...body.map((line) => line.length + 2 * BODY_MARGIN));
  // One column wider when needed, so the legs sit in the middle of the box.
  const innerWidth = minimumWidth + ((minimumWidth + 2 - legSpan) % 2);
  const width = innerWidth + 2;
  const firstLeg = (width - legSpan) / 2;
  const legColumns = legs.map((_, index) => firstLeg + LEG_SPACING * index);
  const nameWidth = Math.max(...legs.map((leg) => leg.name.length));

  const lines = [
    [[`┌${"─".repeat(innerWidth)}┐`, null]],
    ...body.map((line) => [[`│${centered(line, innerWidth)}│`, null]]),
    [[bottomBorder(width, legColumns), null]],
  ];
  // The rightmost leg is led out first, so no wire crosses another.
  for (let index = legs.length - 1; index >= 0; index -= 1) {
    lines.push(legRow(legs[index], legColumns.slice(0, index + 1), width, nameWidth));
  }
  return lines;
}

/** Name each leg and the board pin it goes to, giving the component's GPIOs out in order. */
function describeLegs(legs, pins, pinLabel) {
  const unusedPins = [...pins];
  return legs.map(({ leg, signal, role, to, via }) => {
    const name = UI_TEXT.componentDrawing.legs[leg];
    const viaName = via ? UI_TEXT.componentDrawing.parts[via] : null;
    if (!signal) {
      return { name, via: viaName, target: to, isGpio: false };
    }
    const pin = takePin(unusedPins, role);
    const target = pin ? pinLabel(pin.gpio) : UI_TEXT.componentDrawing.unknownPin;
    return { name, via: viaName, target, isGpio: true };
  });
}

function takePin(unusedPins, role) {
  const byRole = role ? unusedPins.findIndex((pin) => pin.role === role) : -1;
  return unusedPins.splice(Math.max(byRole, 0), 1)[0];
}

function bottomBorder(width, legColumns) {
  const characters = Array.from({ length: width }, (_, column) =>
    legColumns.includes(column) ? "┬" : "─",
  );
  characters[0] = "└";
  characters[width - 1] = "┘";
  return characters.join("");
}

/** One leg's wire: the legs to its left pass straight down, and this one turns right. */
function legRow(leg, columns, width, nameWidth) {
  const column = columns.at(-1);
  const passing = Array.from({ length: column }, (_, index) =>
    columns.includes(index) ? "│" : " ",
  ).join("");
  const wire = `└${"─".repeat(width - column)}`;
  const via = leg.via ? `${leg.via} → ` : "";
  return [
    [`${passing}${wire} ${leg.name.padEnd(nameWidth)} → ${via}`, null],
    [leg.target, leg.isGpio ? GPIO_CLASS : null],
  ];
}

function centered(text, width) {
  const before = Math.floor((width - text.length) / 2);
  return `${" ".repeat(before)}${text}${" ".repeat(width - text.length - before)}`;
}
