from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
from app.services import note_service
from app.services.academic_context import AcademicContextMismatchError, AcademicContextNotFoundError

router = APIRouter()


@router.get("/", response_model=list[NoteResponse])
def read_notes(q: str | None = Query(default=None, max_length=200), subject_id: int | None = Query(default=None, gt=0),
               task_id: int | None = Query(default=None, gt=0), study_session_id: int | None = Query(default=None, gt=0),
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return note_service.list_notes(db, current_user.id, q, subject_id, task_id, study_session_id)


@router.get("/{note_id}", response_model=NoteResponse)
def read_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = note_service.read_note(db, current_user.id, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Anotação não encontrada")
    return note


@router.post("/", response_model=NoteResponse, status_code=201)
def create_note(payload: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return note_service.create_note(db, current_user.id, payload)
    except AcademicContextNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AcademicContextMismatchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, payload: NoteUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        note = note_service.update_note(db, current_user.id, note_id, payload)
    except AcademicContextNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AcademicContextMismatchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if note is None:
        raise HTTPException(status_code=404, detail="Anotação não encontrada")
    return note


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not note_service.delete_note(db, current_user.id, note_id):
        raise HTTPException(status_code=404, detail="Anotação não encontrada")
