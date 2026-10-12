import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";
import { formatDuration } from "../utils/format.js";
import { pickAtRandom } from "../utils/random.js";
import { renderCodeBlock } from "./codeBlock.js";
import { renderPromptText } from "./promptText.js";

const PENDING_STEP_INTERVAL_MS = 3000;

/** A student's request, shown as a command typed at the prompt. */
export function renderCommandLine(content) {
  const line = createElement("li", "line line--command");
  line.append(renderPromptText(), " ", content);
  return line;
}

/**
 * A model reply: code (when there is any), the duck's explanation and how it was generated.
 * codeVersion is { version, repeatsVersion }: repeatsVersion is set when the code is identical
 * to an earlier version, so the student knows the request had no effect. onShowWiring opens
 * what to wire for the code.
 */
export function renderReply(message, codeVersion, onShowWiring) {
  const line = createElement("li", "line line--reply");

  if (message.code) {
    line.append(renderCodeBlock(message.code, codeVersion.version, onShowWiring));
  } else {
    line.append(renderComment(UI_TEXT.noCode));
  }
  if (codeVersion.repeatsVersion) {
    line.append(renderComment(UI_TEXT.sameCodeAs(codeVersion.repeatsVersion)));
  }
  if (message.explanation) {
    line.append(renderDuckSays(message.explanation));
  }
  if (message.metrics) {
    const duration = formatDuration(message.metrics.elapsed_ms);
    line.append(renderComment(UI_TEXT.generatedBy(message.metrics.model, duration)));
  }
  return line;
}

/**
 * Placeholder shown while the model is generating. Its text moves on every few seconds, through
 * the steps of writing a sketch and then through patient remarks, until the line is removed.
 */
export function renderPendingReply() {
  const { steps, stillWaiting } = UI_TEXT.pendingReply;
  const status = createElement("span", null, steps[0]);
  const line = createElement("li", "line line--pending");
  line.append(
    createElement("span", "speaker", UI_TEXT.duckSpeaker),
    " ",
    status,
    createElement("span", "thinking-dots"),
  );

  let step = 0;
  const timer = window.setInterval(() => {
    if (!line.isConnected) {
      window.clearInterval(timer);
      return;
    }
    step += 1;
    status.textContent = step < steps.length ? steps[step] : pickAtRandom(stillWaiting);
  }, PENDING_STEP_INTERVAL_MS);
  return line;
}

/** An error the student needs to read, printed like a command line error. */
export function renderErrorLine(text) {
  const line = createElement("li", "line line--error");
  line.setAttribute("role", "alert");
  line.append(createElement("span", "line__error-label", UI_TEXT.errorLabel), ` ${text}`);
  return line;
}

function renderDuckSays(text) {
  const paragraph = createElement("p", "line__text");
  paragraph.append(
    createElement("span", "speaker", UI_TEXT.duckSpeaker),
    " ",
    createElement("span", "line__explanation", text),
  );
  return paragraph;
}

function renderComment(text) {
  return createElement("p", "line__meta", `${UI_TEXT.commentPrefix} ${text}`);
}
