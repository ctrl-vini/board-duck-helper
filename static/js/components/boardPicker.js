// The board choice, drawn like a terminal menu: a field that opens the list of boards below it.
// It follows the WAI-ARIA select-only combobox pattern, so the keyboard and screen readers work
// with it as with a native <select>; focus stays on the field while the list is open.

import { createElement } from "../utils/dom.js";

// Letters typed this close together are searched as one text, so "arduino n" finds the Nano.
const TYPE_AHEAD_PAUSE_MS = 600;

/**
 * Wrap the picker in root: a field with role="combobox" and a popup with the listbox.
 * onChange(boardId) runs when the student picks a board other than the current one; setting
 * value from code does not run it, as with a native <select>.
 */
export function createBoardPicker(root, onChange) {
  const field = root.querySelector('[role="combobox"]');
  const fieldValue = field.querySelector(".board-picker__value");
  const popup = root.querySelector(".board-picker__popup");
  const list = popup.querySelector('[role="listbox"]');
  let boards = [];
  let options = [];
  let selectedIndex = -1;
  let activeIndex = -1;
  let typed = "";
  let lastTypedAt = 0;

  const isOpen = () => !popup.hidden;
  const isDisabled = () => field.getAttribute("aria-disabled") === "true";

  function renderOption(board, index) {
    const option = createElement("li", "board-picker__option");
    option.id = `${list.id}-${board.id}`;
    option.setAttribute("role", "option");
    const mark = createElement("span", "board-picker__mark", "●");
    mark.setAttribute("aria-hidden", "true");
    option.append(
      mark,
      createElement("span", "board-picker__name", board.name),
      createElement("span", "board-picker__detail", board.microcontroller),
    );
    option.addEventListener("click", () => pick(index));
    option.addEventListener("pointermove", () => setActive(index));
    return option;
  }

  function showSelected() {
    fieldValue.textContent = boards[selectedIndex]?.name ?? "";
    options.forEach((option, index) => {
      option.setAttribute("aria-selected", String(index === selectedIndex));
    });
  }

  function setActive(index) {
    activeIndex = Math.min(Math.max(index, 0), options.length - 1);
    options.forEach((option, i) => {
      option.classList.toggle("board-picker__option--active", i === activeIndex);
    });
    field.setAttribute("aria-activedescendant", options[activeIndex].id);
    options[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function open(index = selectedIndex) {
    if (isDisabled() || options.length === 0) {
      return;
    }
    popup.hidden = false;
    field.setAttribute("aria-expanded", "true");
    setActive(index);
  }

  function close() {
    // The next letters typed start a new search.
    typed = "";
    lastTypedAt = 0;
    popup.hidden = true;
    field.setAttribute("aria-expanded", "false");
    field.removeAttribute("aria-activedescendant");
  }

  function pick(index) {
    close();
    if (index === selectedIndex) {
      return;
    }
    selectedIndex = index;
    showSelected();
    onChange(boards[index].id);
  }

  /** Move to the next board whose name starts with what was just typed, as a <select> does. */
  function findTyped(key) {
    const now = Date.now();
    typed = now - lastTypedAt > TYPE_AHEAD_PAUSE_MS ? key : typed + key;
    lastTypedAt = now;
    const search = typed.toLocaleLowerCase();
    // A repeated first letter steps through the boards that start with it.
    const start = typed.length === 1 ? activeIndex + 1 : activeIndex;
    for (let step = 0; step < boards.length; step += 1) {
      const index = (Math.max(start, 0) + step) % boards.length;
      if (boards[index].name.toLocaleLowerCase().startsWith(search)) {
        return index;
      }
    }
    return -1;
  }

  function handleKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    // A space right after a letter is part of the search; otherwise it opens or picks.
    const isSearching = Date.now() - lastTypedAt <= TYPE_AHEAD_PAUSE_MS;
    if (event.key.length === 1 && (event.key !== " " || isSearching)) {
      event.preventDefault();
      const found = findTyped(event.key);
      if (found >= 0 && isOpen()) {
        setActive(found);
      } else if (found >= 0) {
        open(found);
      }
      return;
    }
    const last = options.length - 1;
    const moves = {
      ArrowDown: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      Home: 0,
      End: last,
      PageDown: last,
      PageUp: 0,
    };
    if (!isOpen()) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        open();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        open(moves[event.key]);
      }
      return;
    }
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      // Leaving keeps the current board: changing it starts a new conversation.
      close();
    }
  }

  field.addEventListener("click", () => (isOpen() ? close() : open()));
  field.addEventListener("keydown", handleKeydown);
  field.addEventListener("blur", close);
  // A press in the list would take the focus off the field and close the list before the click.
  popup.addEventListener("mousedown", (event) => event.preventDefault());
  // On touch screens a tap elsewhere does not always move the focus, so it closes the list too.
  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !root.contains(event.target)) {
      close();
    }
  });

  return {
    setBoards(newBoards) {
      boards = newBoards;
      options = boards.map((board, index) => renderOption(board, index));
      list.replaceChildren(...options);
      selectedIndex = boards.length > 0 ? 0 : -1;
      showSelected();
    },
    get value() {
      return boards[selectedIndex]?.id ?? "";
    },
    set value(boardId) {
      const index = boards.findIndex((board) => board.id === boardId);
      if (index >= 0) {
        selectedIndex = index;
        showSelected();
      }
    },
    get disabled() {
      return isDisabled();
    },
    // Locked while the model works, like the other controls; a locked field leaves the tab order.
    set disabled(locked) {
      field.setAttribute("aria-disabled", String(locked));
      field.tabIndex = locked ? -1 : 0;
      if (locked) {
        close();
      }
    },
  };
}
