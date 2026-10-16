from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.academic_record import Assessment, SubjectSyllabus
from app.models.subject import Subject
from app.models.user import User
from app.schemas.academic_record import AssessmentInput, AssessmentList, AssessmentResponse, SyllabusInput, SyllabusResponse
from app.services import academic_record_service as service

router = APIRouter()


def owned_subject(subject_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Subject:
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user.id).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    return subject


@router.get("/{subject_id}/syllabus", response_model=SyllabusResponse)
def read_syllabus(subject: Subject = Depends(owned_subject), db: Session = Depends(get_db)):
    return db.query(SubjectSyllabus).filter(SubjectSyllabus.subject_id == subject.id).first() or SyllabusResponse()


@router.put("/{subject_id}/syllabus", response_model=SyllabusResponse)
def update_syllabus(payload: SyllabusInput, subject: Subject = Depends(owned_subject), db: Session = Depends(get_db)):
    try:
        return service.save_syllabus(db, subject.id, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="O plano de ensino foi salvo em outra solicitação. Recarregue antes de tentar novamente.") from exc


@router.get("/{subject_id}/assessments", response_model=AssessmentList)
def read_assessments(subject: Subject = Depends(owned_subject), db: Session = Depends(get_db)):
    items = db.query(Assessment).options(joinedload(Assessment.task)).filter(Assessment.subject_id == subject.id, Assessment.user_id == subject.user_id).order_by(Assessment.created_at, Assessment.id).all()
    return AssessmentList(items=[service.assessment_response(item) for item in items], summary=service.summarize_grades(items))


@router.post("/{subject_id}/assessments", response_model=AssessmentResponse, status_code=201)
def create_assessment(payload: AssessmentInput, subject: Subject = Depends(owned_subject), db: Session = Depends(get_db)):
    try:
        return service.assessment_response(service.save_assessment(db, subject.user_id, subject.id, payload))
    except service.AssessmentContextError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def find_assessment(db: Session, subject: Subject, assessment_id: int) -> Assessment:
    item = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.subject_id == subject.id, Assessment.user_id == subject.user_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return item


@router.put("/{subject_id}/assessments/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(assessment_id: int, payload: AssessmentInput, subject: Subject = Depends(owned_subject), db: Session = Depends(get_db)):
    item = find_assessment(db, subject, assessment_id)
    try:
        return service.assessment_response(service.save_assessment(db, subject.user_id, subject.id, payload, item))
    except service.AssessmentContextError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete("/{subject_id}/assessments/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: int, subject: Subject = Depends(owned_subject), db: Session = Depends(get_db)):
    db.delete(find_assessment(db, subject, assessment_id))
    db.commit()
