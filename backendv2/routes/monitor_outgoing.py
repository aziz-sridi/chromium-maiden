from fastapi import APIRouter, Request

from ..models.schemas import ModerationRequest, ModerationResult


router = APIRouter(prefix="/monitor", tags=["moderation"])


@router.post("/outgoing", response_model=ModerationResult)
def monitor_outgoing(payload: ModerationRequest, request: Request) -> ModerationResult:
    engine = request.app.state.engine
    result = engine.moderate_outgoing(text=payload.text, conversation_context=payload.conversation_context)
    return ModerationResult(**result)
