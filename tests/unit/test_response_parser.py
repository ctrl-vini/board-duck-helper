"""Tests for splitting a model reply into code and explanation."""

from app.services.response_parser import parse_response


def test_splits_code_block_and_explanation() -> None:
    reply = "```cpp\nvoid setup() {}\nvoid loop() {}\n```\nO LED pisca a cada segundo."

    parsed = parse_response(reply)

    assert parsed.code == "void setup() {}\nvoid loop() {}"
    assert parsed.explanation == "O LED pisca a cada segundo."


def test_accepts_blocks_without_language_tag() -> None:
    parsed = parse_response("```\nvoid setup() {}\n```\nExplicação.")

    assert parsed.code == "void setup() {}"


def test_keeps_code_indentation() -> None:
    parsed = parse_response("```cpp\nvoid loop() {\n  delay(1000);\n}\n```")

    assert parsed.code == "void loop() {\n  delay(1000);\n}"


def test_joins_text_before_and_after_the_block() -> None:
    parsed = parse_response("Aqui está o código:\n```cpp\nvoid setup() {}\n```\nPronto.")

    assert parsed.explanation == "Aqui está o código:\n\nPronto."


def test_reply_without_code_block_becomes_explanation_only() -> None:
    parsed = parse_response("  A placa não tem um sensor de distância.  ")

    assert parsed.code == ""
    assert parsed.explanation == "A placa não tem um sensor de distância."


def test_only_the_first_block_is_taken_as_code() -> None:
    parsed = parse_response("```cpp\nfirst();\n```\nTexto.\n```cpp\nsecond();\n```")

    assert parsed.code == "first();"
    assert "second();" in parsed.explanation


def test_removes_spaces_left_at_the_end_of_lines() -> None:
    parsed = parse_response("```cpp\nvoid setup() {   \n  pinMode(2, OUTPUT); \n}\n```")

    assert parsed.code == "void setup() {\n  pinMode(2, OUTPUT);\n}"


def test_drops_an_explanation_label() -> None:
    parsed = parse_response("```cpp\nvoid setup() {}\n```\nExplicação: Neste código, o LED pisca.")

    assert parsed.explanation == "Neste código, o LED pisca."


def test_drops_a_bold_explanation_label() -> None:
    parsed = parse_response("```cpp\nvoid setup() {}\n```\n**Explicação:** O LED pisca.")

    assert parsed.explanation == "O LED pisca."


def test_keeps_the_word_explanation_inside_the_text() -> None:
    parsed = parse_response("```cpp\nvoid setup() {}\n```\nA explicação: o LED pisca.")

    assert parsed.explanation == "A explicação: o LED pisca."
