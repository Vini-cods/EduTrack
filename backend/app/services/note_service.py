"""CRUD com contexto validado e isolamento pelo proprietário em todas as operações."""

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.note import Note
from app.models.study_session import StudySession
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
from app.services.academic_context import AcademicContextMismatchError, AcademicContextNotFoundError, resolve_subject_id


def _resolve_context(db: Session, user_id: int, subject_id: int | None, task_id: int | None, session_id: int | None) -> tuple[int | None, int | None]:
    if session_id is not None:
        session = db.query(StudySession).filter(StudySession.id == session_id, StudySession.user_id == user_id).first()
        if session is None:
            raise AcademicContextNotFoundError("Disciplina, tarefa ou sessão não encontrada")
        if task_id is not None and task_id != session.task_id:
            raise AcademicContextMismatchError("A tarefa não corresponde à sessão selecionada")
        if subject_id is not None and subject_id != session.subject_id:
            raise AcademicContextMismatchError("A disciplina não corresponde à sessão selecionada")
        subject_id = session.subject_id if subject_id is None else subject_id
        task_id = session.task_id if task_id is None else task_id
    return resolve_subject_id(db, user_id, subject_id, task_id), task_id


def _response(note: Note) -> NoteResponse:
    return NoteResponse(
        id=note.id, title=note.title, content=note.content, tags=note.tags,
        subject_id=note.subject_id, task_id=note.task_id, study_session_id=note.study_session_id,
        subject_name=note.subject.name if note.subject else None,
        subject_color=note.subject.color if note.subject else None,
        created_at=note.created_at, updated_at=note.updated_at,
    )


def get_note(db: Session, user_id: int, note_id: int) -> Note | None:
    return db.query(Note).options(joinedload(Note.subject)).filter(Note.id == note_id, Note.user_id == user_id).first()


def list_notes(db: Session, user_id: int, q: str | None = None, subject_id: int | None = None,
               task_id: int | None = None, study_session_id: int | None = None) -> list[NoteResponse]:
    query = db.query(Note).options(joinedload(Note.subject)).filter(Note.user_id == user_id)
    for field, value in ((Note.subject_id, subject_id), (Note.task_id, task_id), (Note.study_session_id, study_session_id)):
        if value is not None:
            query = query.filter(field == value)
    if q and q.strip():
        # Autoescape mantém % e _ como texto; não expande a busca acidentalmente.
        query = query.filter(or_(Note.title.icontains(q.strip(), autoescape=True), Note.content.icontains(q.strip(), autoescape=True)))
    return [_response(note) for note in query.order_by(Note.updated_at.desc(), Note.id.desc()).all()]


def read_note(db: Session, user_id: int, note_id: int) -> NoteResponse | None:
    note = get_note(db, user_id, note_id)
    return _response(note) if note else None


def create_note(db: Session, user_id: int, payload: NoteCreate) -> NoteResponse:
    subject_id, task_id = _resolve_context(db, user_id, payload.subject_id, payload.task_id, payload.study_session_id)
    note = Note(**{**payload.model_dump(), "subject_id": subject_id, "task_id": task_id}, user_id=user_id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return _response(note)


def update_note(db: Session, user_id: int, note_id: int, payload: NoteUpdate) -> NoteResponse | None:
    note = get_note(db, user_id, note_id)
    if note is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    subject_id = data.get("subject_id", note.subject_id)
    task_id = data.get("task_id", note.task_id)
    session_id = data.get("study_session_id", note.study_session_id)
    if "study_session_id" in data and session_id != note.study_session_id:
        if "subject_id" not in data:
            subject_id = None
        if "task_id" not in data:
            task_id = None
    elif "task_id" in data and task_id != note.task_id and "subject_id" not in data:
        subject_id = None
    subject_id, task_id = _resolve_context(db, user_id, subject_id, task_id, session_id)
    data.update(subject_id=subject_id, task_id=task_id)
    for field, value in data.items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return _response(note)


def delete_note(db: Session, user_id: int, note_id: int) -> bool:
    note = get_note(db, user_id, note_id)
    if note is None:
        return False
    db.delete(note)
    db.commit()
    return True
