import { UI_TEXT } from "../ui-text.js";
import { createElement } from "../utils/dom.js";
import { renderPromptText } from "./promptText.js";

// "duckoder" in the ANSI Shadow FIGlet font, the kind of banner command-line tools print.
const BANNER = [
  "██████╗ ██╗   ██╗ ██████╗██╗  ██╗ ██████╗ ██████╗ ███████╗██████╗ ",
  "██╔══██╗██║   ██║██╔════╝██║ ██╔╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗",
  "██║  ██║██║   ██║██║     █████╔╝ ██║   ██║██║  ██║█████╗  ██████╔╝",
  "██║  ██║██║   ██║██║     ██╔═██╗ ██║   ██║██║  ██║██╔══╝  ██╔══██╗",
  "██████╔╝╚██████╔╝╚██████╗██║  ██╗╚██████╔╝██████╔╝███████╗██║  ██║",
  "╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝",
];

/**
 * Fill the about dialog (banner, version, what Duckoder is and the credits) and return its
 * controls. open() asks the server for the running version each time.
 */
export function createAboutDialog(dialog, content, loadVersion) {
  const { title, command, description, details, copyright } = UI_TEXT.aboutDialog;
  const version = createElement("p", "about__version");

  const heading = createElement("h2", "visually-hidden", title);
  heading.id = dialog.getAttribute("aria-labelledby");
  const banner = createElement("pre", "about__banner", BANNER.join("\n"));
  banner.setAttribute("aria-hidden", "true");

  content.replaceChildren(
    heading,
    renderCommand(command),
    banner,
    version,
    createElement("p", null, description),
    renderDetails(details),
    createElement("p", "about__copyright", copyright),
  );

  return {
    async open() {
      version.textContent = await versionText(loadVersion);
      if (!dialog.open) {
        dialog.showModal();
      }
    },
  };
}

async function versionText(loadVersion) {
  try {
    const { version } = await loadVersion();
    return UI_TEXT.aboutDialog.version(version);
  } catch {
    // The rest of the dialog is still worth showing when the server cannot answer.
    return "";
  }
}

function renderCommand(command) {
  const line = createElement("p", "about__command");
  line.append(renderPromptText(), ` ${command}`);
  return line;
}

function renderDetails(details) {
  const list = createElement("dl", "about__details");
  for (const { label, value, href } of details) {
    const definition = createElement("dd", "about__value");
    definition.append(href ? renderLink(value, href) : value);
    list.append(createElement("dt", "about__label", label), definition);
  }
  return list;
}

function renderLink(text, href) {
  const link = createElement("a", "about__link", text);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}
