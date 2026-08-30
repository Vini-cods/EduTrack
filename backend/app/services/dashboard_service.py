from sqlalchemy.orm import Session
from uuid import UUID
from app.models.subject import Subject
from app.models.task import Task
from app.schemas.dashboard import DashboardResponse, SubjectProgress

def get_dashboard_metrics(db: Session, user_id: UUID) -> DashboardResponse:
    """
    Calcula as métricas do dashboard para o usuário atual.
    """
    total_subjects = db.query(Subject).filter(Subject.user_id == user_id).count()
    
    user_tasks_query = db.query(Task).join(Subject).filter(Subject.user_id == user_id)
    
    total_tasks = user_tasks_query.count()
    tasks_pending = user_tasks_query.filter(Task.status == "PENDING").count()
    tasks_in_progress = user_tasks_query.filter(Task.status == "IN_PROGRESS").count()
    tasks_completed = user_tasks_query.filter(Task.status == "COMPLETED").count()
    
    overall_progress = (tasks_completed / total_tasks * 100) if total_tasks > 0 else 0.0
    
    subjects = db.query(Subject).filter(Subject.user_id == user_id).all()
    subjects_progress = []
    
    for subject in subjects:
        subj_total = db.query(Task).filter(Task.subject_id == subject.id).count()
        subj_completed = db.query(Task).filter(Task.subject_id == subject.id, Task.status == "COMPLETED").count()
        subj_progress = (subj_completed / subj_total * 100) if subj_total > 0 else 0.0
        
        subjects_progress.append(
            SubjectProgress(
                subject_id=subject.id,
                subject_name=subject.name,
                total_tasks=subj_total,
                completed_tasks=subj_completed,
                progress=subj_progress
            )
        )
        
    return DashboardResponse(
        total_subjects=total_subjects,
        total_tasks=total_tasks,
        tasks_pending=tasks_pending,
        tasks_in_progress=tasks_in_progress,
        tasks_completed=tasks_completed,
        overall_progress=overall_progress,
        subjects_progress=subjects_progress
    )
