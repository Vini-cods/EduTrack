"""Ownership and grading methodology are independent of UI and routes."""
from sqlalchemy.orm import Session

from app.models.academic_record import Assessment, SubjectSyllabus
from app.models.task import Task
from app.schemas.academic_record import AssessmentInput, AssessmentResponse, GradeSummary, SyllabusInput


class AssessmentContextError(ValueError):
    pass


def summarize_grades(items: list[Assessment]) -> GradeSummary:
    graded = [item for item in items if item.score is not None]
    total_weight = sum(item.weight for item in items)
    graded_weight = sum(item.weight for item in graded)
    average = sum(item.score / item.max_score * item.weight for item in graded) / graded_weight * 10 if graded_weight else None
    return GradeSummary(total_count=len(items), graded_count=len(graded), total_weight=total_weight,
                        graded_weight=graded_weight, coverage_percent=round(graded_weight / total_weight * 100, 4) if total_weight else 0,
                        partial_average=round(average, 4) if average is not None else None)


def assessment_response(item: Assessment) -> AssessmentResponse:
    task = item.task
    # Do not expose a cross-owner context even if an imported DB is inconsistent.
    if task and (task.user_id != item.user_id or task.subject_id != item.subject_id):
        task = None
    return AssessmentResponse(id=item.id, subject_id=item.subject_id, name=item.name, score=item.score,
                              max_score=item.max_score, weight=item.weight, task_id=task.id if task else None,
                              task_title=task.title if task else None, due_date=task.due_date if task else None)


def save_assessment(db: Session, user_id: int, subject_id: int, payload: AssessmentInput, item: Assessment | None = None) -> Assessment:
    if payload.task_id is not None:
        task = db.query(Task).filter(Task.id == payload.task_id, Task.user_id == user_id, Task.subject_id == subject_id).first()
        if not task:
            raise AssessmentContextError("Escolha uma tarefa desta disciplina e da sua conta")
    if item is None:
        item = Assessment(user_id=user_id, subject_id=subject_id)
        db.add(item)
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def save_syllabus(db: Session, subject_id: int, payload: SyllabusInput) -> SubjectSyllabus:
    item = db.query(SubjectSyllabus).filter(SubjectSyllabus.subject_id == subject_id).first()
    if item is None:
        item = SubjectSyllabus(subject_id=subject_id)
        db.add(item)
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item
