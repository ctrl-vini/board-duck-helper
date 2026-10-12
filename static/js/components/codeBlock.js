import { UI_TEXT } from "../ui-text.js";
import { copyText } from "../utils/clipboard.js";
import { createElement } from "../utils/dom.js";

const COPY_FEEDBACK_DURATION_MS = 2000;

/**
 * Generated code, framed like a file opened in the terminal, with actions to see what to wire
 * for it and to copy it.
 */
export function renderCodeBlock(code, version, onShowWiring) {
  const block = createElement("figure", "code-block");
  const header = createElement("figcaption", "code-block__header");
  const actions = createElement("span", "code-block__actions");
  actions.append(createWiringButton(onShowWiring), createCopyButton(code));
  header.append(createElement("span", null, UI_TEXT.codeVersion(version)), actions);

  const body = createElement("pre", "code-block__body");
  body.append(createElement("code", null, code));

  block.append(header, body);
  return block;
}

function createWiringButton(onShowWiring) {
  const button = createElement("button", "terminal-button code-block__wiring", UI_TEXT.showWiring);
  button.type = "button";
  button.addEventListener("click", onShowWiring);
  return button;
}

function createCopyButton(code) {
  const button = createElement("button", "terminal-button terminal-button--accent", UI_TEXT.copy);
  button.type = "button";
  button.addEventListener("click", async () => {
    const copied = await copyText(code);
    button.textContent = copied ? UI_TEXT.copied : UI_TEXT.copyFailed;
    window.setTimeout(() => {
      button.textContent = UI_TEXT.copy;
    }, COPY_FEEDBACK_DURATION_MS);
  });
  return button;
}
