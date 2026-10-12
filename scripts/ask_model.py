"""Send one prompt to the configured model and print the reply with its timing.

Usage: python -m scripts.ask_model "Write an ESP32 sketch that blinks the built-in LED"
"""

import argparse
import sys

from app.clients.llm_client import ChatMessage, OllamaClient
from app.config import load_settings
from app.exceptions import LlmUnavailableError


def main() -> int:
    """Run the command line tool and return its exit code."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("prompt", help="text sent to the model as a user message")
    arguments = parser.parse_args()

    client = OllamaClient.from_settings(load_settings())
    try:
        result = client.chat([ChatMessage(role="user", content=arguments.prompt)])
    except LlmUnavailableError as error:
        print(f"Model unavailable: {error}", file=sys.stderr)
        return 1

    print(result.content)
    print(
        f"\nmodel={result.model} elapsed_ms={result.elapsed_ms} "
        f"load_ms={result.load_ms} output_tokens={result.output_tokens}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
