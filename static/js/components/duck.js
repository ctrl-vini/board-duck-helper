import { createElement } from "../utils/dom.js";

const EYE_PLACEHOLDER = "{eye}";
const EYES = { listening: "o", thinking: "-", happy: "^", confused: "O" };

// The duck faces left, toward the transcript it listens to. Only the beak changes between frames.
const FRAMES = {
  closed: [
    "          __",
    "        /'  `\\",
    `       |  ${EYE_PLACEHOLDER}   |`,
    "   ,===|      \\",
    "   `===\\       `-----------.  _",
    "        \\                   `' )",
    "         |  `--.______.--'     /",
    "          \\                   /",
    "           `-._____________.-'",
  ],
  open: [
    "          __",
    "        /'  `\\",
    `       |  ${EYE_PLACEHOLDER}   |`,
    "   ,===|      \\",
    "   \\   \\       `-----------.  _",
    "   `===`\\                   `' )",
    "         |  `--.______.--'     /",
    "          \\                   /",
    "           `-._____________.-'",
  ],
};
const MINI_FRAMES = { closed: `<(${EYE_PLACEHOLDER} )`, open: `=(${EYE_PLACEHOLDER} )` };
const WATER = "  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~";

const TYPING_INTERVAL_MS = 22;
const BEAK_INTERVAL_MS = 140;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Build the duck in the container and return its controls. The duck "speaks" by typing its
 * text in the speech bubble while the beak opens and closes.
 */
export function createDuck(container) {
  // Screen readers get the whole sentence at once; the typed bubble is only visual.
  const announcement = createElement("p", "visually-hidden");
  announcement.setAttribute("role", "status");
  const bubble = createElement("p", "duck__speech");
  bubble.setAttribute("aria-hidden", "true");
  const art = createElement("pre", "duck__art");
  const mini = createElement("pre", "duck__mini");
  art.setAttribute("aria-hidden", "true");
  mini.setAttribute("aria-hidden", "true");
  container.replaceChildren(announcement, bubble, art, mini);

  let typingTimer = null;
  let beakTimer = null;

  function draw(eye, beak) {
    const frame = FRAMES[beak].join("\n").replace(EYE_PLACEHOLDER, eye);
    art.replaceChildren(`${frame}\n`, createElement("span", "duck__water", WATER));
    mini.textContent = MINI_FRAMES[beak].replace(EYE_PLACEHOLDER, eye);
  }

  function stopAnimation() {
    window.clearInterval(typingTimer);
    window.clearInterval(beakTimer);
  }

  function showText(text, thinking) {
    bubble.replaceChildren(text);
    if (thinking) {
      bubble.append(createElement("span", "thinking-dots"));
    }
  }

  /** Change the duck's mood ("listening", "thinking", "happy" or "confused") and say the text. */
  function speak(mood, text) {
    stopAnimation();
    const eye = EYES[mood];
    const thinking = mood === "thinking";
    container.dataset.mood = mood;
    announcement.textContent = text;

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      showText(text, thinking);
      draw(eye, "closed");
      return;
    }

    let typedLength = 0;
    let beakOpen = false;
    bubble.replaceChildren();
    draw(eye, "open");

    beakTimer = window.setInterval(() => {
      beakOpen = !beakOpen;
      draw(eye, beakOpen ? "open" : "closed");
    }, BEAK_INTERVAL_MS);

    typingTimer = window.setInterval(() => {
      typedLength += 1;
      bubble.textContent = text.slice(0, typedLength);
      if (typedLength >= text.length) {
        stopAnimation();
        showText(text, thinking);
        draw(eye, "closed");
      }
    }, TYPING_INTERVAL_MS);
  }

  return { speak };
}
