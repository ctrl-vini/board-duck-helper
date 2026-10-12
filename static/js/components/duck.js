import { createElement } from "../utils/dom.js";

const EYE_PLACEHOLDER = "{eye}";
const EYES = { listening: "o", thinking: "-", happy: "^", confused: "O" };

// The duck faces left, toward the transcript it is listening to.
const DUCK_ART = [
  "       _.._",
  `     .'  ${EYE_PLACEHOLDER} '.`,
  "    <___     |",
  "        \\    '._____  _",
  "        /           `' )",
  "       (              /",
  "        '-.________.-'",
].join("\n");
const WATER = "  ~~~~~~~~~~~~~~~~~~~~~~~";
const MINI_DUCK = `<(${EYE_PLACEHOLDER} )`;

/** Build the duck: a speech bubble, the full drawing and a one-line version for small screens. */
export function renderDuck(container) {
  const speech = createElement("p", "duck__speech");
  speech.setAttribute("role", "status");
  const art = createElement("pre", "duck__art");
  const mini = createElement("pre", "duck__mini");
  art.setAttribute("aria-hidden", "true");
  mini.setAttribute("aria-hidden", "true");
  container.replaceChildren(speech, art, mini);
}

/** Change the duck's face ("listening", "thinking", "happy" or "confused") and what it says. */
export function setDuckMood(container, mood, speech) {
  const eye = EYES[mood];
  container.dataset.mood = mood;

  const bubble = container.querySelector(".duck__speech");
  bubble.replaceChildren(speech);
  if (mood === "thinking") {
    bubble.append(createElement("span", "thinking-dots"));
  }

  container
    .querySelector(".duck__art")
    .replaceChildren(
      `${DUCK_ART.replace(EYE_PLACEHOLDER, eye)}\n`,
      createElement("span", "duck__water", WATER),
    );
  container.querySelector(".duck__mini").textContent = MINI_DUCK.replace(EYE_PLACEHOLDER, eye);
}
