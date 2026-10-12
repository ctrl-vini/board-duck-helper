"""Tests for the version route."""

from fastapi.testclient import TestClient

from app.main import APP_TITLE, APP_VERSION


def test_version_reports_the_running_application(client: TestClient) -> None:
    response = client.get("/version")

    assert response.status_code == 200
    assert response.json() == {"name": APP_TITLE, "version": APP_VERSION}
