"""Route for the version of the running application."""

from fastapi import APIRouter, Request

from app.schemas.version import AppVersion

router = APIRouter(prefix="/version", tags=["version"])


@router.get("")
def get_version(request: Request) -> AppVersion:
    """Return the application's name and version, shown in the interface's about dialog."""
    return AppVersion(name=request.app.title, version=request.app.version)
