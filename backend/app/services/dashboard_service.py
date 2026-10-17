"""Agregados de tarefas por disciplina em uma consulta, isolados por usuário."""

from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.models.subject import Subject
from app.models.task import Task
from app.schemas.dashboard import DashboardResponse, SubjectProgress


def get_dashboard_metrics(db: Session, user_id: int) -> DashboardResponse:
    rows = (
        db.query(
            Subject.id, Subject.name, func.count(Task.id).label("total"),
            func.sum(case((Task.status == "pendente", 1), else_=0)).label("pending"),
            func.sum(case((Task.status == "em_andamento", 1), else_=0)).label("in_progress"),
            func.sum(case((Task.status == "concluida", 1), else_=0)).label("completed"),
        )
        .outerjoin(Task, and_(Task.subject_id == Subject.id, Task.user_id == user_id))
        .filter(Subject.user_id == user_id)
        .group_by(Subject.id, Subject.name)
        .order_by(Subject.id)
        .all()
    )
    total = sum(row.total for row in rows)
    completed = sum(row.completed for row in rows)
    return DashboardResponse(
        total_subjects=len(rows), total_tasks=total,
        tasks_pending=sum(row.pending for row in rows),
        tasks_in_progress=sum(row.in_progress for row in rows), tasks_completed=completed,
        overall_progress=completed / total * 100 if total else 0.0,
        subjects_progress=[
            SubjectProgress(
                subject_id=row.id, subject_name=row.name, total_tasks=row.total,
                completed_tasks=row.completed, progress=row.completed / row.total * 100 if row.total else 0.0,
            )
            for row in rows
        ],
    )
