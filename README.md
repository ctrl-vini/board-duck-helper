# Duckoder

Web platform that generates code for teaching boards, starting with the ESP32, using a language
model that runs locally through [Ollama](https://ollama.com). The student picks a board, explains
to a rubber duck what the board should do, and gets code ready to paste into the IDE, which can be
refined in the same conversation. It works entirely on the local network: no internet access or
paid service is required while it is in use.

## Requirements

- Python 3.11 or newer
- Ollama

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

## Language model

Pull a model and check that it answers:

```bash
ollama pull qwen2.5-coder:7b
ollama run qwen2.5-coder:7b --verbose "Write an Arduino sketch for the ESP32 that blinks the built-in LED on GPIO 2."
```

`--verbose` prints the load time and the generation speed after the answer.

To try a request through the platform's own prompt, board profile and model settings:

```bash
python -m scripts.ask_model "Pisque o LED embutido a cada segundo" --board esp32
```

It prints the extracted code, the explanation and the timing; add `--raw` to also see the
unparsed reply. The system prompt lives in `app/prompts/system_prompt.txt`; bump
`PROMPT_VERSION` in `app/services/prompt_builder.py` whenever it changes, so each saved reply
records the prompt that produced it.

## Running

```bash
python server.py
```

The log shows the address to open from any device on the local network: that page is the
interface students use. The interactive API documentation is available at `/docs`.

## The interface

The page looks like a terminal, with a rubber duck in the corner, as in rubber duck debugging:

- Requests are typed at a shell prompt: Enter sends, Shift+Enter adds a line.
- Each reply prints the code as "versão N" with a copy action and the model's explanation. A
  refinement that comes back with the same code as the previous version is flagged.
- The duck, drawn in braille characters, opens and closes its beak while its message is typed
  out, blinks from time to time, and its eye shows whether it is listening, thinking, happy or
  confused. Animations stop when the system asks for reduced motion.
- `[ ver placa ]` (Ctrl + P, or Cmd + P on a Mac), or typing `pinout` at the prompt, opens the
  board in a pane beside the conversation, like a split terminal: a diagram of the header pins
  with the ones in use highlighted, and a table with each component, its pins and how to wire
  it. The pins stay in view while the student reads the code; the duck shrinks to one line to
  make room. On small screens the pane takes the whole screen until `[ fechar ]`. This command
  runs in the page and is not sent to the model.
- Picking a board and sending a request starts a conversation; its id goes into the page address
  (`/?conversation=<id>`), so reloading or sharing the link reopens it.
- `[ limpar conversa ]` (Ctrl + L or Cmd + L), or typing a usual clear-screen command (`clear`,
  `reset`, `cls`, `clear-host` or `clc`), asks for confirmation, where Enter clears and Esc
  cancels; the next request starts a new conversation, so the model no longer sees the earlier
  messages.
- Hovering over a button shows its shortcut. On this page the shortcuts replace the browser's
  own (jumping to the address bar and printing), which stay available from the browser's menu.
- `[ sobre ]`, at the right end of the status bar, shows what Duckoder is, the running version,
  the author and the credits.

It is plain HTML, CSS and JavaScript modules in `static/`, with no build step and nothing loaded
from the internet. The JetBrains Mono font is bundled in `static/fonts/` under the SIL Open Font
License, with ligatures turned off so operators such as `<=` show the exact characters to type.

## Configuration

All settings are environment variables with defaults, so nothing needs to be set to get started.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_HOST` | `0.0.0.0` | Network interface the server listens on |
| `APP_PORT` | `8000` | Server port |
| `APP_OLLAMA_URL` | `http://localhost:11434` | Address of the Ollama service |
| `APP_OLLAMA_MODEL` | `qwen2.5-coder:7b` | Model used to generate code |
| `APP_LLM_TEMPERATURE` | `0.7` | Sampling temperature; higher values vary more between runs |
| `APP_LLM_CONTEXT_SIZE` | `8192` | Context window in tokens; Ollama silently drops what exceeds it |
| `APP_LLM_KEEP_ALIVE` | `30m` | How long Ollama keeps the model loaded after the last request |
| `APP_BOARDS_DIR` | `data/boards` | Folder with the board profiles |
| `APP_CONVERSATIONS_DIR` | `data/conversations` | Folder where each conversation is saved as JSON |

Example: `APP_OLLAMA_MODEL=llama3.1:8b python server.py`.

## API

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/boards` | — | `200` boards with `id`, `name`, `microcontroller` |
| GET | `/boards/{id}` | — | `200` the full board profile, with components, wiring and pinout |
| POST | `/conversations` | `{"board_id"}` | `201` the new, empty conversation |
| POST | `/conversations/{id}/messages` | `{"content"}` | `201` the model's reply, with `code`, `explanation` and `metrics` |
| GET | `/conversations/{id}` | — | `200` the conversation with every message |
| GET | `/version` | — | `200` the application's `name` and `version` |

Errors use `{"detail": "..."}`: `404` for an unknown board or conversation, `422` for an invalid
body, `502` when Ollama cannot answer. If the model fails, nothing is saved, so the student can
simply send the message again. Try every route from `/docs`.

## Adding a board

Each board is described by one JSON file in `data/boards/`. To add a board, copy `esp32.json`,
give it a new `id` and restart the server. Invalid files stop the server at startup with a
message naming the file.

| Field | Content |
| --- | --- |
| `id` | Lowercase letters, digits and hyphens; used in the API paths |
| `name`, `microcontroller` | Shown to the student and sent to the model |
| `language`, `framework` | What the generated code must target, such as C++ on Arduino |
| `components` | What is wired to the board: `name`, `type`, `pins` and an optional `wiring` text |
| `notes` | Usage restrictions and libraries the model must respect |
| `pinout` | Optional header layout for the board view: `caption`, `left` and `right` pin lists |

Each pin of a component has a `gpio` number and an optional `role`, such as `SDA`. Each header
pin has a `label` and, when it is a GPIO, its `gpio` number; a profile whose components use a
GPIO missing from its pinout is rejected. For example:

```json
{
  "name": "Display OLED",
  "type": "SSD1306 128x64, I2C, endereço 0x3C",
  "pins": [{ "gpio": 21, "role": "SDA" }, { "gpio": 22, "role": "SCL" }],
  "wiring": "VCC no 3V3, GND no GND, SDA no GPIO 21 e SCL no GPIO 22."
}
```

The profile is sent to the model as context without `pinout` and the `wiring` texts: those are
for the student, and leaving them out keeps the prompt shorter. The texts the student reads are
in Brazilian Portuguese.

## Development checks

Run before every commit:

```bash
ruff check .
ruff format --check .
pytest
```

The tests replace Ollama with a fake model, so they need neither Ollama nor a network.

## Continuous integration and releases

- `.github/workflows/ci.yml` runs the development checks on Python 3.11 and 3.12 for every pull
  request and every push to `master`.
- `.github/workflows/release.yml` runs when a version tag is pushed. It runs the same checks,
  confirms that the tag matches `APP_VERSION` in `app/main.py`, and publishes a GitHub release
  with generated notes and a `duckoder-<tag>.zip` archive of the source.

To publish a version, update `APP_VERSION`, commit, then tag and push:

```bash
git tag v1.0.0
git push origin master --tags
```

## Manual end-to-end check

With Ollama and the server running, from another device on the same network:

1. Open the address from the server log; the board list loads.
2. Run `pinout`: the diagram and the wiring table open in a pane beside the conversation.
3. Send "Pisque o LED embutido a cada segundo"; the code appears as "versão 1".
4. Ask for a change, such as "Tire os comentários do código"; "versão 2" applies it.
5. Reload the page; the conversation comes back from the address.
6. Copy the code; it pastes intact into the Arduino IDE.
7. Type `clear` and confirm; the screen empties and the next reply starts again at "versão 1".
8. Stop Ollama and send a request; a readable error appears and the duck looks confused.
