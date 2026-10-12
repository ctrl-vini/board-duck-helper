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

## Running

```bash
python server.py
```

The log shows the address to open from any device on the local network. The interactive API
documentation is available at `/docs`.

## Configuration

All settings are environment variables with defaults, so nothing needs to be set to get started.

| Variable | Default | Purpose |
|---|---|---|
| `APP_HOST` | `0.0.0.0` | Network interface the server listens on |
| `APP_PORT` | `8000` | Server port |
| `APP_OLLAMA_URL` | `http://localhost:11434` | Address of the Ollama service |
| `APP_OLLAMA_MODEL` | `qwen2.5-coder:7b` | Model used to generate code |

Example: `APP_OLLAMA_MODEL=llama3.1:8b python server.py`.

## Development checks

Run before every commit:

```bash
ruff check .
ruff format --check .
pytest
```
