// Keyboard shortcuts for the status bar buttons: Ctrl+key, or Cmd+key on a Mac.

import { createElement } from "./dom.js";

const IS_MAC = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform ?? navigator.platform);
const MODIFIER_LABEL = IS_MAC ? "cmd" : "ctrl";

/**
 * Give every button with a data-shortcut key its shortcut, and a hint that shows it on hover.
 * The page takes over the browser's own action for those keys (Ctrl+L, for example, would
 * jump to the address bar). Disabled buttons ignore their shortcut, and so does the page while
 * a dialog is open.
 */
export function bindShortcuts(root = document) {
  const buttonsByKey = new Map();
  for (const button of root.querySelectorAll("button[data-shortcut]")) {
    const key = button.dataset.shortcut.toLowerCase();
    const shownKey = key.toUpperCase();
    buttonsByKey.set(key, button);
    button.setAttribute("aria-keyshortcuts", `Control+${shownKey} Meta+${shownKey}`);
    const hint = renderShortcut(key);
    hint.classList.add("shortcut-hint");
    // Assistive technologies get the shortcut from aria-keyshortcuts instead.
    hint.setAttribute("aria-hidden", "true");
    button.append(hint);
  }

  document.addEventListener("keydown", (event) => {
    const isShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
    // Some keydown events, such as the ones from autofill, carry no key.
    const button = isShortcut && event.key ? buttonsByKey.get(event.key.toLowerCase()) : null;
    if (!button) {
      return;
    }
    event.preventDefault();
    if (!event.repeat && !document.querySelector("dialog[open]")) {
      // click() does nothing on a disabled button, so locked controls stay locked.
      button.click();
    }
  });
}

/**
 * A key combination such as "ctrl + L" drawn as keycaps, in nested <kbd> elements, which is how
 * HTML marks up keys pressed together.
 */
export function renderShortcut(key) {
  const shortcut = createElement("kbd", "shortcut");
  shortcut.append(
    createElement("kbd", "keycap", MODIFIER_LABEL),
    " + ",
    createElement("kbd", "keycap", key.toUpperCase()),
  );
  return shortcut;
}
