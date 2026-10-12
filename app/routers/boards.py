"""Routes for the board catalog."""

from fastapi import APIRouter

from app.dependencies import BoardRegistryDep
from app.schemas.board import BoardSummary

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("")
def list_boards(registry: BoardRegistryDep) -> list[BoardSummary]:
    """List the boards students can choose from."""
    return [BoardSummary.from_profile(profile) for profile in registry.list_boards()]
