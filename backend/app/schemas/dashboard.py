from pydantic import BaseModel
from typing import List
from uuid import UUID

class SubjectProgress(BaseModel):
    """
    Schema representando o progresso de uma disciplina no dashboard.
    """
    subject_id: UUID
    subject_name: str
    total_tasks: int
    completed_tasks: int
    progress: float

class DashboardResponse(BaseModel):
    """
    Schema de resposta para os dados do dashboard.
    """
    total_subjects: int
    total_tasks: int
    tasks_pending: int
    tasks_in_progress: int
    tasks_completed: int
    overall_progress: float
    subjects_progress: List[SubjectProgress]
