import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";

const PIN_HOLE = "○";
const BOARD_INNER_WIDTH = 12;
const BOARD_CHIP_LABEL = "ESP32";
const BOARD_PORT_LABEL = "[USB]";
const LEFT_WIRE = "●━━";
const RIGHT_WIRE = "━━●";
const NO_WIRE = "   ";
// Characters around the label on each side: spaces, the wire and the stub that meets the board.
const SIDE_DECORATION_WIDTH = 1 + LEFT_WIRE.length + 1 + 1 + 1;

/** What the student needs to wire the board: the drawing, the connections and the notes. */
export function renderBoardView(profile) {
  const view = createElement("div", "board-view");
  view.append(createElement("p", "board-view__title", profile.name));
  view.append(renderComment(profile.microcontroller));

  if (profile.pinout) {
    view.append(renderDiagram(profile.pinout, profile.components));
    if (profile.pinout.caption) {
      view.append(renderComment(profile.pinout.caption));
    }
  } else {
    view.append(renderComment(UI_TEXT.noPinout));
  }
  view.append(renderWiringTable(profile.components));
  for (const note of profile.notes) {
    view.append(renderComment(note));
  }
  return view;
}

/**
 * Draw the board with both header rows; a used pin is highlighted and labeled with its component.
 * Each output line is a list of [text, isUsed] segments, so used pins can be colored.
 */
function renderDiagram(pinout, components) {
  const usage = describeGpioUsage(components);
  const labelWidth = Math.max(...[...pinout.left, ...pinout.right].map((pin) => pin.label.length));
  const leftNoteWidth = Math.max(0, ...pinout.left.map((pin) => noteFor(pin, usage).length));
  const rowCount = Math.max(pinout.left.length, pinout.right.length);
  const chipRow = Math.floor(rowCount / 2);

  const leftEdgeWidth = leftNoteWidth + labelWidth + SIDE_DECORATION_WIDTH;
  const indent = " ".repeat(leftEdgeWidth);
  const lines = [[[`${indent}┌${"─".repeat(BOARD_INNER_WIDTH)}┐`, false]]];

  for (let row = 0; row < rowCount; row += 1) {
    const middle = row === chipRow ? centered(BOARD_CHIP_LABEL) : " ".repeat(BOARD_INNER_WIDTH - 2);
    lines.push([
      ...leftSide(pinout.left[row], usage, labelWidth, leftNoteWidth),
      [`┤${PIN_HOLE}${middle}${PIN_HOLE}├`, false],
      ...rightSide(pinout.right[row], usage, labelWidth),
    ]);
  }

  const port = centered(BOARD_PORT_LABEL, BOARD_INNER_WIDTH, "─");
  lines.push([[`${indent}└${port}┘`, false]]);

  const diagram = createElement("pre", "board-diagram");
  diagram.setAttribute("aria-hidden", "true");
  lines.forEach((segments, index) => {
    if (index > 0) {
      diagram.append("\n");
    }
    for (const [text, isUsed] of segments) {
      diagram.append(isUsed ? createElement("span", "board-diagram__used", text) : text);
    }
  });
  return diagram;
}

function leftSide(pin, usage, labelWidth, noteWidth) {
  if (!pin) {
    return [[" ".repeat(noteWidth + labelWidth + SIDE_DECORATION_WIDTH), false]];
  }
  const note = noteFor(pin, usage);
  const wire = note ? LEFT_WIRE : NO_WIRE;
  return [
    [`${note.padStart(noteWidth)} ${wire} ${pin.label.padStart(labelWidth)} `, Boolean(note)],
    ["─", false],
  ];
}

function rightSide(pin, usage, labelWidth) {
  if (!pin) {
    return [];
  }
  const note = noteFor(pin, usage);
  const label = ` ${pin.label.padEnd(labelWidth)}`;
  return [
    ["─", false],
    [note ? `${label} ${RIGHT_WIRE} ${note}` : label, Boolean(note)],
  ];
}

function centered(text, width = BOARD_INNER_WIDTH - 2, fill = " ") {
  const padding = width - text.length;
  const before = Math.floor(padding / 2);
  return `${fill.repeat(before)}${text}${fill.repeat(padding - before)}`;
}

/** Map each used GPIO to the component (and role) connected to it. */
function describeGpioUsage(components) {
  const usage = new Map();
  for (const component of components) {
    for (const pin of component.pins) {
      const description = UI_TEXT.usageWithRole(component.name, pin.role);
      const existing = usage.get(pin.gpio);
      usage.set(pin.gpio, existing ? `${existing}, ${description}` : description);
    }
  }
  return usage;
}

function noteFor(pin, usage) {
  return pin.gpio === undefined || pin.gpio === null ? "" : (usage.get(pin.gpio) ?? "");
}

function renderWiringTable(components) {
  const table = createElement("table", "wiring-table");
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
      createElement("td", "wiring-table__component", component.name),
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
