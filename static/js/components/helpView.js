import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";
import { renderShortcut } from "../utils/shortcuts.js";

/** Output of the help command: every local command, what it does and its shortcut. */
export function renderHelp() {
  const { title, headers, entries, aliases, keys } = UI_TEXT.help;
  const line = createElement("li", "line line--help");

  const headerRow = createElement("tr");
  for (const header of headers) {
    headerRow.append(createElement("th", null, header));
  }
  const head = createElement("thead");
  head.append(headerRow);

  const body = createElement("tbody");
  for (const { command, description, key } of entries) {
    const [name, ...otherNames] = UI_TEXT.commands[command];
    const what = otherNames.length ? description + aliases(otherNames) : description;
    const shortcut = createElement("td");
    if (key) {
      shortcut.append(renderShortcut(key));
    }
    const row = createElement("tr");
    row.append(
      createElement("td", "terminal-table__key", name),
      createElement("td", null, what),
      shortcut,
    );
    body.append(row);
  }

  const table = createElement("table", "terminal-table");
  table.append(head, body);
  line.append(
    createElement("p", "line__meta", title),
    table,
    createElement("p", "line__meta", `${UI_TEXT.commentPrefix} ${keys}`),
  );
  return line;
}
