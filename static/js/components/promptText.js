import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";

/** The shell prompt, e.g. "aluno@lab:~$", colored like a terminal's. */
export function renderPromptText() {
  const prompt = createElement("span", "prompt-text");
  prompt.append(
    createElement("span", "prompt-text__user", UI_TEXT.promptUser),
    ":",
    createElement("span", "prompt-text__path", UI_TEXT.promptPath),
    "$",
  );
  return prompt;
}
