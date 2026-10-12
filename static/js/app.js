// Wires the terminal screen to the API: board choice, conversation history and sending requests.

import * as api from "./services/api.js";
import { fillBoardSelect } from "./components/boardSelect.js";
import { renderDuck, setDuckMood } from "./components/duck.js";
import {
  renderCommandLine,
  renderErrorLine,
  renderPendingReply,
  renderReply,
} from "./components/messageView.js";
import { renderMotd } from "./components/motd.js";
import { renderPromptText } from "./components/promptText.js";
import { UI_TEXT, errorMessageFor } from "./ui-text.js";
import { readConversationId, writeConversationId } from "./utils/conversationUrl.js";
import { fitToContent } from "./utils/fitToContent.js";

const NOT_FOUND_STATUS = 404;

const elements = {
  boardSelect: document.getElementById("board-select"),
  newConversationButton: document.getElementById("new-conversation"),
  motd: document.getElementById("motd"),
  lines: document.getElementById("lines"),
  duck: document.getElementById("duck"),
  promptForm: document.getElementById("prompt-form"),
  promptLabel: document.getElementById("prompt-label"),
  requestInput: document.getElementById("request"),
  sendButton: document.getElementById("send"),
};

const state = {
  conversationId: null,
  codeVersion: 0,
};

async function init() {
  applyStaticTexts();
  elements.promptLabel.append(renderPromptText());
  renderMotd(elements.motd, useExample);
  renderDuck(elements.duck);
  setDuckMood(elements.duck, "listening", UI_TEXT.duck.listening);

  elements.promptForm.addEventListener("submit", handleSubmit);
  elements.requestInput.addEventListener("keydown", submitOnEnter);
  elements.requestInput.addEventListener("input", () => fitToContent(elements.requestInput));
  elements.newConversationButton.addEventListener("click", startNewConversation);
  elements.boardSelect.addEventListener("change", startNewConversation);

  if (await loadBoards()) {
    await restoreConversation();
  }
  elements.requestInput.focus();
}

function applyStaticTexts() {
  for (const element of document.querySelectorAll("[data-text]")) {
    element.textContent = UI_TEXT[element.dataset.text];
  }
}

/** Fill the board list; returns false when the platform cannot be used. */
async function loadBoards() {
  try {
    const boards = await api.listBoards();
    fillBoardSelect(elements.boardSelect, boards);
    if (boards.length > 0) {
      return true;
    }
    showError(UI_TEXT.noBoards);
  } catch (error) {
    showError(errorMessageFor(error));
  }
  setDuckMood(elements.duck, "confused", UI_TEXT.duck.confused);
  elements.sendButton.disabled = true;
  return false;
}

async function restoreConversation() {
  const conversationId = readConversationId();
  if (!conversationId) {
    return;
  }
  try {
    const conversation = await api.getConversation(conversationId);
    state.conversationId = conversation.id;
    elements.boardSelect.value = conversation.board_id;
    for (const message of conversation.messages) {
      appendMessage(message);
    }
  } catch (error) {
    if (error.status === NOT_FOUND_STATUS) {
      writeConversationId(null);
      showError(UI_TEXT.conversationNotFound);
    } else {
      showError(errorMessageFor(error));
    }
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const content = elements.requestInput.value.trim();
  if (!content) {
    elements.requestInput.focus();
    return;
  }

  clearErrors();
  lockControls(true);
  setDuckMood(elements.duck, "thinking", UI_TEXT.duck.thinking);
  const command = appendToTranscript(renderCommandLine(content));
  const pending = appendToTranscript(renderPendingReply());
  setRequestText("");

  try {
    const conversationId = await ensureConversation();
    const reply = await api.sendMessage(conversationId, content);
    pending.remove();
    appendMessage(reply, "start");
    setDuckMood(elements.duck, "happy", duckReactionTo(reply));
  } catch (error) {
    // The server stores nothing when a request fails, so the screen drops it too and
    // gives the text back for another try.
    pending.remove();
    command.remove();
    setRequestText(content);
    showError(errorMessageFor(error));
    setDuckMood(elements.duck, "confused", UI_TEXT.duck.confused);
  } finally {
    lockControls(false);
    elements.requestInput.focus();
  }
}

async function ensureConversation() {
  if (!state.conversationId) {
    const conversation = await api.createConversation(elements.boardSelect.value);
    state.conversationId = conversation.id;
    writeConversationId(conversation.id);
  }
  return state.conversationId;
}

function startNewConversation() {
  state.conversationId = null;
  state.codeVersion = 0;
  writeConversationId(null);
  elements.lines.replaceChildren();
  updateMotd();
  setDuckMood(elements.duck, "listening", UI_TEXT.duck.listening);
  elements.requestInput.focus();
}

function appendMessage(message, scrollAlignment = "nearest") {
  const element =
    message.role === "user"
      ? renderCommandLine(message.content)
      : renderReply(message, nextCodeVersion(message));
  return appendToTranscript(element, scrollAlignment);
}

/** Replies that carry code are numbered, so the student can tell each revision apart. */
function nextCodeVersion(message) {
  if (message.code) {
    state.codeVersion += 1;
  }
  return state.codeVersion;
}

function duckReactionTo(reply) {
  return reply.code ? UI_TEXT.duck.happy(state.codeVersion) : UI_TEXT.duck.noCode;
}

function appendToTranscript(element, scrollAlignment = "nearest") {
  elements.lines.append(element);
  updateMotd();
  element.scrollIntoView({ block: scrollAlignment });
  return element;
}

function showError(text) {
  appendToTranscript(renderErrorLine(text));
}

function clearErrors() {
  for (const line of elements.lines.querySelectorAll('[role="alert"]')) {
    line.remove();
  }
}

function updateMotd() {
  elements.motd.hidden = elements.lines.childElementCount > 0;
}

/** Lock the controls while the model works, so a second request cannot start meanwhile. */
function lockControls(locked) {
  for (const control of [elements.sendButton, elements.boardSelect, elements.newConversationButton]) {
    control.disabled = locked;
  }
  elements.requestInput.readOnly = locked;
}

function setRequestText(text) {
  elements.requestInput.value = text;
  fitToContent(elements.requestInput);
}

function useExample(example) {
  setRequestText(example);
  elements.requestInput.focus();
}

/** Enter sends, like a terminal; Shift+Enter adds a line break. */
function submitOnEnter(event) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    elements.promptForm.requestSubmit();
  }
}

init();
