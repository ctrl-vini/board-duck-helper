"""Tests for the application shell: frontend and API docs."""

from fastapi.testclient import TestClient


def test_root_serves_the_frontend(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_api_docs_are_available(client: TestClient) -> None:
    response = client.get("/docs")

    assert response.status_code == 200
