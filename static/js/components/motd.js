import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";

/** Message of the day: what the platform does, with examples that fill the prompt when picked. */
export function renderMotd(container, onExamplePicked) {
  const { title, lines, examplesTitle, examples } = UI_TEXT.motd;

  const exampleList = createElement("ul", "motd__examples");
  examples.forEach((example, index) => {
    const button = createElement("button", "example-button");
    button.type = "button";
    button.append(createElement("span", "example-button__index", `[${index + 1}]`), ` ${example}`);
    button.addEventListener("click", () => onExamplePicked(example));
    const item = createElement("li");
    item.append(button);
    exampleList.append(item);
  });

  container.replaceChildren(
    createElement("p", "motd__title", title),
    ...lines.map((line) => createElement("p", null, line)),
    createElement("p", "motd__muted", examplesTitle),
    exampleList,
  );
}
