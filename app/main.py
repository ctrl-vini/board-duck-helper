"""Application factory."""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import Settings

APP_TITLE = "Board Code Assistant"
APP_VERSION = "0.1.0"


def create_app(settings: Settings) -> FastAPI:
    """Create the FastAPI application with its API routes and the static frontend."""
    app = FastAPI(title=APP_TITLE, version=APP_VERSION)

    # Mounted at "/", the frontend would capture every API route, so it must be registered last.
    app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="frontend")
    return app
