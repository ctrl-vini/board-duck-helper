"""Tests for the board catalog routes."""

from fastapi.testclient import TestClient


def test_list_boards_returns_only_public_fields(client: TestClient) -> None:
    response = client.get("/boards")

    assert response.status_code == 200
    assert response.json() == [
        {"id": "test-board", "name": "Test Board", "microcontroller": "ESP32"},
    ]


def test_get_board_returns_the_full_profile(client: TestClient) -> None:
    response = client.get("/boards/test-board")

    assert response.status_code == 200
    board = response.json()
    assert board["components"][0]["pins"] == [{"gpio": 2, "role": None}]
    assert board["pinout"] is None


def test_get_unknown_board_returns_404(client: TestClient) -> None:
    response = client.get("/boards/missing-board")

    assert response.status_code == 404
    assert response.json() == {"detail": "Board not found: missing-board"}
