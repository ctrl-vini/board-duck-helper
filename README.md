# Board Code Assistant

Web platform that generates code for teaching boards, starting with the ESP32, using a language
model that runs locally through [Ollama](https://ollama.com). It works entirely on the local
network: no internet access or paid service is required while it is in use.

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
`PROMPT_VERSION` in `app/services/prompt_builder.py` whenever it changes.

## Running

```bash
python server.py
```

The log shows the address to open from any device on the local network. The interactive API
documentation is available at `/docs`.

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
| POST | `/conversations` | `{"board_id"}` | `201` the new, empty conversation |
| POST | `/conversations/{id}/messages` | `{"content"}` | `201` the model's reply, with `code`, `explanation` and `metrics` |
| GET | `/conversations/{id}` | — | `200` the conversation with every message |

Errors use `{"detail": "..."}`: `404` for an unknown board or conversation, `422` for an invalid
body, `502` when Ollama cannot answer. If the model fails, nothing is saved, so the student can
simply send the message again. Try every route from `/docs`.

## Adding a board

Each board is described by one JSON file in `data/boards/`: its microcontroller, target language
and framework, the components wired to it with their pins, and notes on usage restrictions. This
profile is sent to the model as context; the API only exposes the board's id, name and
microcontroller. To add a board, copy `esp32.json`, give it a new `id` and restart the server.
Invalid files stop the server at startup with a message naming the file.

## Development checks

Run before every commit:

```bash
ruff check .
ruff format --check .
pytest
```
