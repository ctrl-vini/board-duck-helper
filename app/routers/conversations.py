"""Routes for conversations and their messages."""

from fastapi import APIRouter, status

from app.dependencies import ConversationServiceDep
from app.schemas.conversation import Conversation, ConversationCreate, Message, MessageCreate

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_conversation(body: ConversationCreate, service: ConversationServiceDep) -> Conversation:
    """Start a conversation about one board."""
    return service.start(body.board_id)


@router.get("/{conversation_id}")
def get_conversation(conversation_id: str, service: ConversationServiceDep) -> Conversation:
    """Return a conversation with all its messages."""
    return service.get(conversation_id)


@router.post("/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: str, body: MessageCreate, service: ConversationServiceDep
) -> Message:
    """Send what the student asks for and return the model's reply."""
    return service.send_message(conversation_id, body.content)
