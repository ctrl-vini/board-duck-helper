"""Shared pytest fixtures."""

import pytest
from fastapi.testclient import TestClient

from app.config import load_settings
from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    """HTTP client bound to a fresh application instance."""
    return TestClient(create_app(load_settings()))
