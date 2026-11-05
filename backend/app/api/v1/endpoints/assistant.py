"""Chat autenticado: não expõe credenciais nem aceita um proprietário no body."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, AssistantStatus
from app.services import assistant_service

router = APIRouter()


@router.get("/status", response_model=AssistantStatus)
def read_assistant_status(current_user: User = Depends(get_current_user)):
    return assistant_service.get_status()


@router.post("/chat", response_model=AssistantChatResponse)
async def send_assistant_message(request: AssistantChatRequest, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    try:
        return await assistant_service.chat(db, current_user.id, request)
    except assistant_service.AssistantError as exc:
        headers = {"Retry-After": "5"} if exc.status_code == 429 else None
        raise HTTPException(status_code=exc.status_code, detail=exc.detail, headers=headers) from None
