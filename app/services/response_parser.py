"""Splits a model reply into the generated code and its explanation."""

import re
from dataclasses import dataclass

# Opening fence with an optional language tag, the code, then the closing fence.
CODE_BLOCK_PATTERN = re.compile(r"```[^\n]*\n(.*?)\n?```", re.DOTALL)
PARAGRAPH_SEPARATOR = "\n\n"


@dataclass(frozen=True)
class ParsedResponse:
    """The code found in a reply (empty when there is none) and the remaining text."""

    code: str
    explanation: str


def parse_response(text: str) -> ParsedResponse:
    """Take the first fenced code block as the code and everything around it as the explanation."""
    match = CODE_BLOCK_PATTERN.search(text)
    if match is None:
        return ParsedResponse(code="", explanation=text.strip())

    explanation = _join_paragraphs(text[: match.start()], text[match.end() :])
    return ParsedResponse(code=_strip_trailing_spaces(match.group(1)), explanation=explanation)


def _strip_trailing_spaces(code: str) -> str:
    # Removing comments often leaves spaces at the end of the lines they were on.
    return "\n".join(line.rstrip() for line in code.rstrip().splitlines())


def _join_paragraphs(*parts: str) -> str:
    return PARAGRAPH_SEPARATOR.join(part.strip() for part in parts if part.strip())
