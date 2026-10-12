import { createElement } from "../utils/dom.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { WATER, drawDuck, drawMiniDuck } from "./duckArt.js";

const EYE_FOR_MOOD = { listening: "open", thinking: "up", happy: "happy", confused: "wide" };

const TYPING_INTERVAL_MS = 22;
const BEAK_INTERVAL_MS = 140;
const BLINK_DURATION_MS = 160;
const BLINK_DELAY_MIN_MS = 2500;
const BLINK_DELAY_MAX_MS = 6000;

/**
 * Build the duck in the container and return its controls. The duck "speaks" by typing its
 * text in the speech bubble while the beak opens and closes, and blinks from time to time. It
 * also keeps its beak moving while something it says is typed elsewhere, such as a reply.
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

  const face = { eye: EYE_FOR_MOOD.listening, beakOpen: false, blinking: false };
  let typingTimer = null;
  let beakTimer = null;
  // Texts typed outside the bubble while the duck talks, such as the explanation of a reply.
  let textsBeingTyped = 0;

  function draw() {
    const eye = face.blinking ? "closed" : face.eye;
    art.replaceChildren(
      `${drawDuck(eye, face.beakOpen)}\n`,
      createElement("span", "duck__water", WATER),
    );
    mini.textContent = drawMiniDuck(eye, face.beakOpen);
  }

  function startBeak() {
    if (beakTimer !== null) {
      return;
    }
    face.beakOpen = true;
    beakTimer = window.setInterval(() => {
      face.beakOpen = !face.beakOpen;
      draw();
    }, BEAK_INTERVAL_MS);
  }

  /** Close the beak once neither the bubble nor any other text is still being typed. */
  function stopBeakWhenDone() {
    if (typingTimer !== null || textsBeingTyped > 0 || beakTimer === null) {
      return;
    }
    window.clearInterval(beakTimer);
    beakTimer = null;
    face.beakOpen = false;
  }

  function stopTyping() {
    window.clearInterval(typingTimer);
    typingTimer = null;
  }

  function showText(text, thinking) {
    bubble.replaceChildren(text);
    if (thinking) {
      bubble.append(createElement("span", "thinking-dots"));
    }
  }

  function blinkFromTimeToTime() {
    const delay = BLINK_DELAY_MIN_MS + Math.random() * (BLINK_DELAY_MAX_MS - BLINK_DELAY_MIN_MS);
    window.setTimeout(() => {
      if (!prefersReducedMotion()) {
        face.blinking = true;
        draw();
        window.setTimeout(() => {
          face.blinking = false;
          draw();
        }, BLINK_DURATION_MS);
      }
      blinkFromTimeToTime();
    }, delay);
  }

  /** Change the duck's mood ("listening", "thinking", "happy" or "confused") and say the text. */
  function speak(mood, text) {
    stopTyping();
    const thinking = mood === "thinking";
    face.eye = EYE_FOR_MOOD[mood];
    container.dataset.mood = mood;
    announcement.textContent = text;

    if (prefersReducedMotion()) {
      showText(text, thinking);
      draw();
      return;
    }

    let typedLength = 0;
    bubble.replaceChildren();
    startBeak();
    draw();

    typingTimer = window.setInterval(() => {
      typedLength += 1;
      bubble.textContent = text.slice(0, typedLength);
      if (typedLength >= text.length) {
        stopTyping();
        stopBeakWhenDone();
        showText(text, thinking);
        draw();
      }
    }, TYPING_INTERVAL_MS);
  }

  /** Keep the beak moving until the typing that the promise stands for is over. */
  function keepTalking(typing) {
    if (prefersReducedMotion()) {
      return;
    }
    textsBeingTyped += 1;
    startBeak();
    draw();
    typing.finally(() => {
      textsBeingTyped -= 1;
      stopBeakWhenDone();
      draw();
    });
  }

  draw();
  blinkFromTimeToTime();
  return { speak, keepTalking };
}
