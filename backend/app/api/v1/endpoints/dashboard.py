from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
def read_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna as métricas e estatísticas do dashboard para o usuário atual.
    """
    return dashboard_service.get_dashboard_metrics(db=db, user_id=current_user.id)
