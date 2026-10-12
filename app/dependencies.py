"""Dependency providers that hand routes the service instances built at startup."""

from typing import Annotated

from fastapi import Depends, Request

from app.services.board_registry import BoardRegistry


def get_board_registry(request: Request) -> BoardRegistry:
    """Return the board registry created with the application."""
    return request.app.state.board_registry


BoardRegistryDep = Annotated[BoardRegistry, Depends(get_board_registry)]
