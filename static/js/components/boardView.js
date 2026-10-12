import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";

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
const NO_USAGE = { note: "", className: null };

/**
 * What the student needs to wire the board: the drawing, the connections and the notes.
 * With wiring ({ version, usage }), only what that code version uses is shown, and the pins it
 * uses that have no component are flagged.
 */
export function renderBoardView(profile, wiring = null) {
  const components = wiring ? wiring.usage.components : profile.components;
  const unlistedGpios = wiring ? wiring.usage.unlisted_gpios : [];

  const view = createElement("div", "board-view");
  view.append(createElement("p", "board-view__title", profile.name));
  view.append(renderComment(profile.microcontroller));
  if (wiring) {
    view.append(renderComment(UI_TEXT.wiringOfVersion(wiring.version)));
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
    view.append(renderDiagram(profile.pinout, describeGpioUsage(components, unlistedGpios)));
    if (profile.pinout.caption) {
      view.append(renderComment(profile.pinout.caption));
    }
  } else {
    view.append(renderComment(UI_TEXT.noPinout));
  }
  if (components.length > 0) {
    view.append(renderWiringTable(components));
  } else {
    view.append(renderComment(UI_TEXT.noComponentsUsed(wiring.version)));
  }
  for (const note of profile.notes) {
    view.append(renderComment(note));
  }
  return view;
}

/**
 * Draw the board with both header rows; a used pin is highlighted and labeled with its component.
 * Each output line is a list of [text, className] segments, so used pins can be colored.
 */
function renderDiagram(pinout, usage) {
  const labelWidth = Math.max(...[...pinout.left, ...pinout.right].map((pin) => pin.label.length));
  const leftNoteWidth = Math.max(0, ...pinout.left.map((pin) => usageOf(pin, usage).note.length));
  const rowCount = Math.max(pinout.left.length, pinout.right.length);
  const chipRow = Math.floor(rowCount / 2);

  const leftEdgeWidth = leftNoteWidth + labelWidth + SIDE_DECORATION_WIDTH;
  const indent = " ".repeat(leftEdgeWidth);
  const lines = [[[`${indent}┌${"─".repeat(BOARD_INNER_WIDTH)}┐`, null]]];

  for (let row = 0; row < rowCount; row += 1) {
    const middle = row === chipRow ? centered(BOARD_CHIP_LABEL) : " ".repeat(BOARD_INNER_WIDTH - 2);
    lines.push([
      ...leftSide(pinout.left[row], usage, labelWidth, leftNoteWidth),
      [`┤${PIN_HOLE}${middle}${PIN_HOLE}├`, null],
      ...rightSide(pinout.right[row], usage, labelWidth),
    ]);
  }

  const port = centered(BOARD_PORT_LABEL, BOARD_INNER_WIDTH, "─");
  lines.push([[`${indent}└${port}┘`, null]]);

  const diagram = createElement("pre", "board-diagram");
  diagram.setAttribute("aria-hidden", "true");
  lines.forEach((segments, index) => {
    if (index > 0) {
      diagram.append("\n");
    }
    for (const [text, className] of segments) {
      diagram.append(className ? createElement("span", className, text) : text);
    }
  });
  return diagram;
}

function leftSide(pin, usage, labelWidth, noteWidth) {
  if (!pin) {
    return [[" ".repeat(noteWidth + labelWidth + SIDE_DECORATION_WIDTH), null]];
  }
  const { note, className } = usageOf(pin, usage);
  const wire = note ? LEFT_WIRE : NO_WIRE;
  return [
    [`${note.padStart(noteWidth)} ${wire} ${pin.label.padStart(labelWidth)} `, className],
    ["─", null],
  ];
}

function rightSide(pin, usage, labelWidth) {
  if (!pin) {
    return [];
  }
  const { note, className } = usageOf(pin, usage);
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

function usageOf(pin, usage) {
  return pin.gpio === undefined || pin.gpio === null ? NO_USAGE : (usage.get(pin.gpio) ?? NO_USAGE);
}

function renderWiringTable(components) {
  const table = createElement("table", "terminal-table");
  const headerRow = createElement("tr");
  for (const header of UI_TEXT.wiringHeaders) {
    headerRow.append(createElement("th", null, header));
  }
  const head = createElement("thead");
  head.append(headerRow);

  const body = createElement("tbody");
  for (const component of components) {
    const pins = component.pins.map((pin) => UI_TEXT.pinWithRole(pin.gpio, pin.role)).join(", ");
    const row = createElement("tr");
    row.append(
      createElement("td", "terminal-table__key", component.name),
      createElement("td", null, pins),
      createElement("td", null, component.wiring ?? component.type),
    );
    body.append(row);
  }

  table.append(head, body);
  return table;
}

function renderComment(text) {
  return createElement("p", "line__meta", `${UI_TEXT.commentPrefix} ${text}`);
}
