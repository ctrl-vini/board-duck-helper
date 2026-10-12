import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";
import { drawComponent } from "./componentDrawing.js";

// "◯" rather than "○", which the bundled font lacks: a glyph from another font may be wider.
const PIN_HOLE = "◯";
const BOARD_INNER_WIDTH = 12;
const BOARD_CHIP_LABEL = "ESP32";
const BOARD_PORT_LABEL = "[USB]";
const LEFT_WIRE = "●━━";
const RIGHT_WIRE = "━━●";
const NO_WIRE = "   ";
// Characters around the label on each side: spaces, the wire and the stub that meets the board.
const SIDE_DECORATION_WIDTH = 1 + LEFT_WIRE.length + 1 + 1 + 1;
const USED_PIN_CLASS = "board-diagram__used";
const UNLISTED_PIN_CLASS = "board-diagram__unlisted";
const ESSENTIAL_PIN_CLASS = "board-diagram__essential";
const NO_USAGE = { note: "", className: null };

/**
 * What the student needs to wire the board: the drawing, the connections and the notes.
 * Without wiring, nothing is connected yet: only the pins nearly every circuit uses, such as GND
 * and 3V3, are marked, with what each is for. With wiring ({ version, usage }), only what that
 * code version uses is shown, each component drawn with where its legs go; pins the code moved
 * and pins it uses with no component are flagged.
 */
export function renderBoardView(profile, wiring = null) {
  const components = wiring ? wiring.usage.components : profile.components;
  const movedPins = wiring ? wiring.usage.moved_pins : [];
  const unlistedGpios = wiring ? wiring.usage.unlisted_gpios : [];
  const pinLabel = pinLabeler(profile.pinout);

  const view = createElement("div", "board-view");
  view.append(createElement("p", "board-view__title", profile.name));
  view.append(renderComment(profile.microcontroller));
  if (profile.ide_board) {
    view.append(renderComment(UI_TEXT.ideBoard(profile.ide_board)));
  }
  view.append(
    renderComment(wiring ? UI_TEXT.wiringOfVersion(wiring.version) : UI_TEXT.essentialPinsHint),
  );
  for (const { component, role, from_gpio: fromGpio, to_gpio: toGpio } of movedPins) {
    const name = UI_TEXT.usageWithRole(component, role);
    const notice = UI_TEXT.movedPin(name, fromGpio, toGpio, pinLabel(toGpio));
    view.append(createElement("p", "board-view__notice", `${UI_TEXT.commentPrefix} ${notice}`));
  }
  if (unlistedGpios.length > 0) {
    view.append(
      createElement(
        "p",
        "board-view__warning",
        `${UI_TEXT.commentPrefix} ${UI_TEXT.unlistedGpios(unlistedGpios)}`,
      ),
    );
  }

  if (profile.pinout) {
    const pinNote = wiring
      ? gpioPinNote(describeGpioUsage(components, unlistedGpios))
      : essentialPinNote;
    view.append(renderDiagram(profile.pinout, pinNote));
    if (profile.pinout.caption) {
      view.append(renderComment(profile.pinout.caption));
    }
  } else {
    view.append(renderComment(UI_TEXT.noPinout));
  }
  if (!wiring) {
    // A board without described pins falls back to the components and where they would go.
    const essentialPins = profile.pinout && renderEssentialPinsTable(profile.pinout);
    view.append(essentialPins || renderWiringTable(components));
  } else if (components.length > 0) {
    view.append(renderComponentCards(components, pinLabel));
  } else {
    view.append(renderComment(UI_TEXT.noComponentsUsed(wiring.version)));
  }
  for (const note of profile.notes) {
    view.append(renderComment(note));
  }
  return view;
}

/**
 * Draw the board with both header rows; pinNote(pin) gives the note drawn beside a pin and its
 * color class, such as the component wired to it. Each output line is a list of
 * [text, className] segments, so marked pins can be colored.
 */
function renderDiagram(pinout, pinNote) {
  const labelWidth = Math.max(...[...pinout.left, ...pinout.right].map((pin) => pin.label.length));
  const leftNoteWidth = Math.max(0, ...pinout.left.map((pin) => pinNote(pin).note.length));
  const rowCount = Math.max(pinout.left.length, pinout.right.length);
  const chipRow = Math.floor(rowCount / 2);

  const leftEdgeWidth = leftNoteWidth + labelWidth + SIDE_DECORATION_WIDTH;
  const indent = " ".repeat(leftEdgeWidth);
  const lines = [[[`${indent}┌${"─".repeat(BOARD_INNER_WIDTH)}┐`, null]]];

  for (let row = 0; row < rowCount; row += 1) {
    const middle = row === chipRow ? centered(BOARD_CHIP_LABEL) : " ".repeat(BOARD_INNER_WIDTH - 2);
    lines.push([
      ...leftSide(pinout.left[row], pinNote, labelWidth, leftNoteWidth),
      [`┤${PIN_HOLE}${middle}${PIN_HOLE}├`, null],
      ...rightSide(pinout.right[row], pinNote, labelWidth),
    ]);
  }

  const port = centered(BOARD_PORT_LABEL, BOARD_INNER_WIDTH, "─");
  lines.push([[`${indent}└${port}┘`, null]]);
  return renderArt(lines, "board-diagram");
}

/** A text drawing from lines of [text, className] segments; screen readers skip it. */
function renderArt(lines, className) {
  const art = createElement("pre", className);
  art.setAttribute("aria-hidden", "true");
  lines.forEach((segments, index) => {
    if (index > 0) {
      art.append("\n");
    }
    for (const [text, segmentClass] of segments) {
      art.append(segmentClass ? createElement("span", segmentClass, text) : text);
    }
  });
  return art;
}

/** One card per component: its name, its drawing and the wiring text, which screen readers get. */
function renderComponentCards(components, pinLabel) {
  const cards = createElement("div", "component-cards");
  for (const component of components) {
    const card = createElement("div", "component-card");
    card.append(createElement("p", "component-card__name", component.name));
    const drawing = drawComponent(component, pinLabel);
    if (drawing) {
      card.append(renderArt(drawing, "component-card__drawing"));
    }
    card.append(renderComment(component.wiring ?? component.type));
    cards.append(card);
  }
  return cards;
}

/** Name GPIOs as printed on the board's header, so the drawings match the board drawing. */
function pinLabeler(pinout) {
  const labels = new Map(
    pinout ? [...pinout.left, ...pinout.right].map((pin) => [pin.gpio, pin.label]) : [],
  );
  return (gpio) => labels.get(gpio) ?? UI_TEXT.pinWithRole(gpio);
}

function leftSide(pin, pinNote, labelWidth, noteWidth) {
  if (!pin) {
    return [[" ".repeat(noteWidth + labelWidth + SIDE_DECORATION_WIDTH), null]];
  }
  const { note, className } = pinNote(pin);
  const wire = note ? LEFT_WIRE : NO_WIRE;
  return [
    [`${note.padStart(noteWidth)} ${wire} ${pin.label.padStart(labelWidth)} `, className],
    ["─", null],
  ];
}

function rightSide(pin, pinNote, labelWidth) {
  if (!pin) {
    return [];
  }
  const { note, className } = pinNote(pin);
  const label = ` ${pin.label.padEnd(labelWidth)}`;
  return [
    ["─", null],
    [note ? `${label} ${RIGHT_WIRE} ${note}` : label, className],
  ];
}

function centered(text, width = BOARD_INNER_WIDTH - 2, fill = " ") {
  const padding = width - text.length;
  const before = Math.floor(padding / 2);
  return `${fill.repeat(before)}${text}${fill.repeat(padding - before)}`;
}

/**
 * Map each used GPIO to the note drawn beside it: the component (and role) connected to it, or a
 * warning for a GPIO the code uses with no component.
 */
function describeGpioUsage(components, unlistedGpios) {
  const usage = new Map();
  for (const component of components) {
    for (const pin of component.pins) {
      const description = UI_TEXT.usageWithRole(component.name, pin.role);
      const existing = usage.get(pin.gpio)?.note;
      const note = existing ? `${existing}, ${description}` : description;
      usage.set(pin.gpio, { note, className: USED_PIN_CLASS });
    }
  }
  for (const gpio of unlistedGpios) {
    usage.set(gpio, { note: UI_TEXT.unlistedPinNote, className: UNLISTED_PIN_CLASS });
  }
  return usage;
}

/** Notes for the pins a code version uses, looked up by GPIO. */
function gpioPinNote(usage) {
  return (pin) =>
    pin.gpio === undefined || pin.gpio === null ? NO_USAGE : (usage.get(pin.gpio) ?? NO_USAGE);
}

/** Notes for the pins nearly every circuit uses, such as GND, from the profile. */
function essentialPinNote(pin) {
  return pin.note ? { note: pin.note, className: ESSENTIAL_PIN_CLASS } : NO_USAGE;
}

function renderWiringTable(components) {
  const rows = components.map((component) => [
    component.name,
    component.pins.map((pin) => UI_TEXT.pinWithRole(pin.gpio, pin.role)).join(", "),
    component.wiring ?? component.type,
  ]);
  return renderTerminalTable(UI_TEXT.wiringHeaders, rows);
}

/** What each described pin is for; pins with the same description, like TX0 and RX0, share a row. */
function renderEssentialPinsTable(pinout) {
  const labelsByDescription = new Map();
  for (const pin of [...pinout.left, ...pinout.right]) {
    if (pin.description) {
      const labels = labelsByDescription.get(pin.description) ?? [];
      if (!labels.includes(pin.label)) {
        labels.push(pin.label);
      }
      labelsByDescription.set(pin.description, labels);
    }
  }
  if (labelsByDescription.size === 0) {
    return null;
  }
  const rows = [...labelsByDescription].map(([description, labels]) => [
    labels.join(", "),
    description,
  ]);
  return renderTerminalTable(UI_TEXT.essentialPinsHeaders, rows);
}

/** A table printed like command output; the first cell of each row is its key. */
function renderTerminalTable(headers, rows) {
  const headerRow = createElement("tr");
  for (const header of headers) {
    headerRow.append(createElement("th", null, header));
  }
  const head = createElement("thead");
  head.append(headerRow);

  const body = createElement("tbody");
  for (const [key, ...cells] of rows) {
    const row = createElement("tr");
    row.append(
      createElement("td", "terminal-table__key", key),
      ...cells.map((cell) => createElement("td", null, cell)),
    );
    body.append(row);
  }

  const table = createElement("table", "terminal-table");
  table.append(head, body);
  return table;
}

function renderComment(text) {
  return createElement("p", "line__meta", `${UI_TEXT.commentPrefix} ${text}`);
}
