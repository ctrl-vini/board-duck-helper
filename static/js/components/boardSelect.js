import { createElement } from "../utils/dom.js";

/** Fill the board dropdown with one option per board. */
export function fillBoardSelect(select, boards) {
  select.replaceChildren(...boards.map((board) => createOption(board)));
}

function createOption(board) {
  const option = createElement("option", null, board.name);
  option.value = board.id;
  return option;
}
