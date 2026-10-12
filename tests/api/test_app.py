"""Tests for the application shell: frontend and API docs."""

from fastapi.testclient import TestClient


def test_root_serves_the_frontend(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_api_docs_are_available(client: TestClient) -> None:
    response = client.get("/docs")

    assert response.status_code == 200


def test_frontend_files_are_revalidated_on_every_load(client: TestClient) -> None:
    first = client.get("/js/app.js")
    again = client.get("/js/app.js", headers={"If-None-Match": first.headers["etag"]})

    assert first.headers["cache-control"] == "no-cache"
    assert again.status_code == 304
    assert again.headers["cache-control"] == "no-cache"
