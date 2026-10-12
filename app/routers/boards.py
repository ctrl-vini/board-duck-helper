"""Routes for the board catalog."""

from fastapi import APIRouter

from app.dependencies import BoardRegistryDep
from app.schemas.board import BoardProfile, BoardSummary

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("")
def list_boards(registry: BoardRegistryDep) -> list[BoardSummary]:
    """List the boards students can choose from."""
    return [BoardSummary.from_profile(profile) for profile in registry.list_boards()]


@router.get("/{board_id}")
def get_board(board_id: str, registry: BoardRegistryDep) -> BoardProfile:
    """Return a board's profile: components, how to wire them and the header layout."""
    return registry.get_board(board_id)
