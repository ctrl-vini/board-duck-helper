// Wires the terminal screen to the API: board choice, conversation history and sending requests.

import * as api from "./services/api.js";
import { createAboutDialog } from "./components/about.js";
import { fillBoardSelect } from "./components/boardSelect.js";
import { renderBoardView } from "./components/boardView.js";
import { createConfirmDialog } from "./components/confirmDialog.js";
import { createDuck } from "./components/duck.js";
import { renderHelp } from "./components/helpView.js";
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
import { playQuack } from "./utils/quackSound.js";
import { bindShortcuts } from "./utils/shortcuts.js";

const NOT_FOUND_STATUS = 404;

const elements = {
  boardSelect: document.getElementById("board-select"),
  clearConversationButton: document.getElementById("clear-conversation"),
  showBoardButton: document.getElementById("show-board"),
  boardPane: document.getElementById("board-pane"),
  boardPaneCommand: document.getElementById("board-pane-command"),
  boardPaneBody: document.getElementById("board-pane-body"),
  boardScopeButton: document.getElementById("board-scope"),
  closeBoardButton: document.getElementById("close-board"),
  showAboutButton: document.getElementById("show-about"),
  motd: document.getElementById("motd"),
  lines: document.getElementById("lines"),
  promptForm: document.getElementById("prompt-form"),
  promptLabel: document.getElementById("prompt-label"),
  requestInput: document.getElementById("request"),
  sendButton: document.getElementById("send"),
};

const duck = createDuck(document.getElementById("duck"));
const clearDialog = createConfirmDialog(document.getElementById("clear-dialog"));
const aboutDialog = createAboutDialog(
  document.getElementById("about-dialog"),
  document.getElementById("about-content"),
  api.getVersion,
);

const state = {
  conversationId: null,
  codeVersion: 0,
  latestCode: null,
  // Replies with code are referred to as { messageId, version }.
  latestCodeReply: null,
  // What the board pane shows: the wiring of one reply's code, or the whole board when null.
  boardPaneReply: null,
};

// Board profiles never change while the server runs, so each one is fetched once; so is the
// pin usage of each reply, since its code never changes either.
const boardProfiles = new Map();
const pinUsages = new Map();

// What each local command does; the names students can type for them are in UI_TEXT.commands.
const LOCAL_COMMANDS = {
  help: showHelp,
  pinout: openBoardPane,
  clear: askToClearConversation,
  about: () => aboutDialog.open(),
  quack,
};

async function init() {
  applyStaticTexts();
  bindShortcuts();
  elements.promptLabel.append(renderPromptText());
  elements.boardPaneCommand.append(renderPromptText(), ` ${UI_TEXT.commands.pinout[0]}`);
  elements.boardPane.setAttribute("aria-label", UI_TEXT.boardPaneLabel);
  renderMotd(elements.motd, useExample);
  duck.speak("listening", UI_TEXT.duck.listening);

  elements.promptForm.addEventListener("submit", handleSubmit);
  elements.requestInput.addEventListener("keydown", submitOnEnter);
  elements.requestInput.addEventListener("input", () => fitToContent(elements.requestInput));
  elements.clearConversationButton.addEventListener("click", askToClearConversation);
  elements.showBoardButton.addEventListener("click", toggleBoardPane);
  elements.closeBoardButton.addEventListener("click", closeBoardPane);
  elements.boardScopeButton.addEventListener("click", toggleBoardScope);
  elements.showAboutButton.addEventListener("click", () => aboutDialog.open());
  elements.boardSelect.addEventListener("change", changeBoard);

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
  duck.speak("confused", UI_TEXT.duck.confused);
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
  if (await runLocalCommand(content)) {
    return;
  }

  clearErrors();
  lockControls(true);
  duck.speak("thinking", UI_TEXT.duck.thinking);
  const command = appendToTranscript(renderCommandLine(content));
  const pending = appendToTranscript(renderPendingReply());
  setRequestText("");

  try {
    const conversationId = await ensureConversation();
    const reply = await api.sendMessage(conversationId, content);
    pending.remove();
    const codeVersion = appendMessage(reply, "start");
    reactToReply(reply, codeVersion);
    if (reply.code) {
      // An open board pane moves on to the new version, so it never shows outdated pins.
      refreshBoardPane(state.latestCodeReply);
    }
  } catch (error) {
    // The server stores nothing when a request fails, so the screen drops it too and
    // gives the text back for another try.
    pending.remove();
    command.remove();
    setRequestText(content);
    showError(errorMessageFor(error));
    duck.speak("confused", UI_TEXT.duck.confused);
  } finally {
    lockControls(false);
    elements.requestInput.focus();
  }
}

/** Run a command the page answers by itself, without the model; returns whether one ran. */
async function runLocalCommand(content) {
  const typed = content.toLowerCase();
  const command = Object.keys(LOCAL_COMMANDS).find((name) =>
    UI_TEXT.commands[name].includes(typed),
  );
  if (!command) {
    return false;
  }
  setRequestText("");
  await LOCAL_COMMANDS[command](content);
  return true;
}

/** Print the commands and their shortcuts, like a terminal's help output. */
function showHelp(typedCommand) {
  clearErrors();
  appendToTranscript(renderCommandLine(typedCommand));
  appendToTranscript(renderHelp(), "start");
  duck.speak("happy", UI_TEXT.duck.help);
}

function quack() {
  playQuack();
  const { quacks } = UI_TEXT.duck;
  duck.speak("happy", quacks[Math.floor(Math.random() * quacks.length)]);
}

/** Open the board pane on the latest code version, or on the whole board before any code. */
function openBoardPane() {
  return showBoard(state.latestCodeReply);
}

/**
 * Show the board in a pane beside the conversation, like a terminal split, so the pins stay in
 * view while the student reads the code. For a reply, only what its code uses is shown.
 */
async function showBoard(reply) {
  clearErrors();
  try {
    const wiring = await renderBoardPane(reply);
    setBoardPaneOpen(true);
    speakAboutBoard(wiring);
  } catch (error) {
    showError(errorMessageFor(error));
    duck.speak("confused", UI_TEXT.duck.confused);
  }
  elements.requestInput.focus();
}

/** Draw the whole board, or what one reply's code uses, in the pane; returns that wiring. */
async function renderBoardPane(reply) {
  const profile = await loadBoardProfile(elements.boardSelect.value);
  const wiring = reply
    ? { version: reply.version, usage: await loadPinUsage(reply.messageId) }
    : null;
  elements.boardPaneBody.replaceChildren(renderBoardView(profile, wiring));
  elements.boardPaneBody.scrollTop = 0;
  state.boardPaneReply = reply;
  updateBoardScopeButton();
  return wiring;
}

/** Redraw an open pane without the duck's comment, when the conversation changes under it. */
function refreshBoardPane(reply) {
  if (isBoardPaneOpen()) {
    renderBoardPane(reply).catch((error) => showError(errorMessageFor(error)));
  }
}

function speakAboutBoard(wiring) {
  if (!wiring) {
    duck.speak("happy", UI_TEXT.duck.board);
  } else if (wiring.usage.unlisted_gpios.length > 0) {
    duck.speak("confused", UI_TEXT.duck.unlistedGpios(wiring.version, wiring.usage.unlisted_gpios));
  } else if (wiring.usage.components.length === 0) {
    duck.speak("happy", UI_TEXT.duck.noComponents(wiring.version));
  } else {
    duck.speak("happy", UI_TEXT.duck.wiring(wiring.version));
  }
}

/** Once there is code, the pane switches between its wiring and the whole board. */
function updateBoardScopeButton() {
  const latest = state.latestCodeReply;
  elements.boardScopeButton.hidden = !latest;
  if (latest) {
    elements.boardScopeButton.textContent = state.boardPaneReply
      ? UI_TEXT.fullBoard
      : UI_TEXT.versionWiring(latest.version);
  }
}

function toggleBoardScope() {
  showBoard(state.boardPaneReply ? null : state.latestCodeReply);
}

function closeBoardPane() {
  setBoardPaneOpen(false);
  // What the duck said was about the pane; while a reply is on its way, it keeps thinking.
  if (!isWaitingForReply()) {
    duck.speak("listening", UI_TEXT.duck.listening);
  }
  elements.requestInput.focus();
}

function toggleBoardPane() {
  if (isBoardPaneOpen()) {
    closeBoardPane();
  } else {
    openBoardPane();
  }
}

function setBoardPaneOpen(open) {
  elements.boardPane.hidden = !open;
  elements.showBoardButton.setAttribute("aria-expanded", String(open));
}

function isBoardPaneOpen() {
  return !elements.boardPane.hidden;
}

/** A conversation belongs to one board: picking another starts over, and an open pane follows. */
function changeBoard() {
  startNewConversation();
}

async function loadBoardProfile(boardId) {
  if (!boardProfiles.has(boardId)) {
    boardProfiles.set(boardId, await api.getBoard(boardId));
  }
  return boardProfiles.get(boardId);
}

async function loadPinUsage(messageId) {
  if (!pinUsages.has(messageId)) {
    pinUsages.set(messageId, await api.getPinUsage(state.conversationId, messageId));
  }
  return pinUsages.get(messageId);
}

async function ensureConversation() {
  if (!state.conversationId) {
    const conversation = await api.createConversation(elements.boardSelect.value);
    state.conversationId = conversation.id;
    writeConversationId(conversation.id);
  }
  return state.conversationId;
}

async function askToClearConversation() {
  if (await clearDialog.ask()) {
    startNewConversation();
  }
}

function startNewConversation() {
  state.conversationId = null;
  state.codeVersion = 0;
  state.latestCode = null;
  state.latestCodeReply = null;
  writeConversationId(null);
  elements.lines.replaceChildren();
  updateMotd();
  refreshBoardPane(null);
  duck.speak("listening", UI_TEXT.duck.listening);
  elements.requestInput.focus();
}

/** Show a message; for replies, returns how its code was numbered. */
function appendMessage(message, scrollAlignment = "nearest") {
  if (message.role === "user") {
    appendToTranscript(renderCommandLine(message.content), scrollAlignment);
    return null;
  }
  const codeVersion = trackCodeVersion(message);
  const reply = { messageId: message.id, version: codeVersion.version };
  const showWiring = () => showBoard(reply);
  appendToTranscript(renderReply(message, codeVersion, showWiring), scrollAlignment);
  return codeVersion;
}

/**
 * Number the replies that carry code, so the student can tell each revision apart, and notice
 * when a reply repeats the previous code unchanged.
 */
function trackCodeVersion(message) {
  if (!message.code) {
    return { version: state.codeVersion, repeatsVersion: null };
  }
  const repeatsVersion = message.code === state.latestCode ? state.codeVersion : null;
  state.codeVersion += 1;
  state.latestCode = message.code;
  state.latestCodeReply = { messageId: message.id, version: state.codeVersion };
  return { version: state.codeVersion, repeatsVersion };
}

function reactToReply(reply, codeVersion) {
  if (!reply.code) {
    duck.speak("confused", UI_TEXT.duck.noCode);
  } else if (codeVersion.repeatsVersion) {
    duck.speak("confused", UI_TEXT.duck.unchanged(codeVersion.repeatsVersion));
  } else {
    duck.speak("happy", UI_TEXT.duck.happy(codeVersion.version));
  }
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
  const controls = [
    elements.sendButton,
    elements.boardSelect,
    elements.clearConversationButton,
    elements.showBoardButton,
    elements.boardScopeButton,
    ...elements.lines.querySelectorAll(".code-block__wiring"),
  ];
  for (const control of controls) {
    control.disabled = locked;
  }
  elements.requestInput.readOnly = locked;
}

/** The prompt is read-only only while the model generates a reply. */
function isWaitingForReply() {
  return elements.requestInput.readOnly;
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
