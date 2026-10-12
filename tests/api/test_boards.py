"""Tests for the board catalog routes."""

from fastapi.testclient import TestClient


def test_list_boards_returns_only_public_fields(client: TestClient) -> None:
    response = client.get("/boards")

    assert response.status_code == 200
    assert response.json() == [
        {"id": "test-board", "name": "Test Board", "microcontroller": "ESP32"},
    ]
