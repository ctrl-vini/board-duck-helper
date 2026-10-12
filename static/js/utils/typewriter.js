import { createElement } from "./dom.js";
import { prefersReducedMotion } from "./motion.js";

const TYPING_INTERVAL_MS = 20;
// Long texts type several characters at a time, so no text takes longer than this to appear.
const MAX_TYPING_DURATION_MS = 4000;

/**
 * Retype the element's text a few characters at a time, as if someone were typing it. Screen
 * readers get the whole text from the start. Resolves when the text is complete, or at once
 * when the element leaves the page or the system asks for reduced motion.
 */
export function typeOut(element) {
  const text = element.textContent;
  if (prefersReducedMotion() || !text) {
    return Promise.resolve();
  }

  const typed = createElement("span");
  typed.setAttribute("aria-hidden", "true");
  element.replaceChildren(createElement("span", "visually-hidden", text), typed);
  const charactersPerTick = Math.ceil(text.length / (MAX_TYPING_DURATION_MS / TYPING_INTERVAL_MS));

  return new Promise((resolve) => {
    let typedLength = 0;
    const timer = window.setInterval(() => {
      typedLength += charactersPerTick;
      typed.textContent = text.slice(0, typedLength);
      if (typedLength >= text.length || !element.isConnected) {
        window.clearInterval(timer);
        element.textContent = text;
        resolve();
      }
    }, TYPING_INTERVAL_MS);
  });
}
