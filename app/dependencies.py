"""Dependency providers that hand routes the service instances built at startup."""

from typing import Annotated

from fastapi import Depends, Request

from app.services.board_registry import BoardRegistry
from app.services.conversation_service import ConversationService


def get_board_registry(request: Request) -> BoardRegistry:
    """Return the board registry created with the application."""
    return request.app.state.board_registry


def get_conversation_service(request: Request) -> ConversationService:
    """Return the conversation service created with the application."""
    return request.app.state.conversation_service


BoardRegistryDep = Annotated[BoardRegistry, Depends(get_board_registry)]
ConversationServiceDep = Annotated[ConversationService, Depends(get_conversation_service)]
