"""Serviço de materiais de estudo."""

from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.material import Material
from app.models.subject import Subject
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialWithSubject


def _to_with_subject(material: Material, subject_name: str, subject_color: Optional[str]) -> MaterialWithSubject:
    return MaterialWithSubject(
        id=material.id,
        title=material.title,
        category=material.category,
        status=material.status,
        url=material.url,
        description=material.description,
        subject_id=material.subject_id,
        created_at=material.created_at,
        updated_at=material.updated_at,
        subject_name=subject_name,
        subject_color=subject_color,
    )


def get_materials_for_user(db: Session, user_id: int) -> List[MaterialWithSubject]:
    """Todos os materiais do usuário, de todas as disciplinas — usado pela página /materials."""
    rows = (
        db.query(Material, Subject.name, Subject.color)
        .join(Subject, Material.subject_id == Subject.id)
        .filter(Subject.user_id == user_id)
        .order_by(Material.created_at.desc())
        .all()
    )
    return [_to_with_subject(material, name, color) for material, name, color in rows]


def get_materials_by_subject(db: Session, subject_id: int, user_id: int) -> List[Material]:
    """Materiais de uma disciplina específica — usado por SubjectDetail (mesmo padrão de get_tasks_by_subject)."""
    return (
        db.query(Material)
        .join(Subject)
        .filter(Material.subject_id == subject_id, Subject.user_id == user_id)
        .order_by(Material.created_at.desc())
        .all()
    )


def get_material_by_id(db: Session, material_id: int, user_id: int) -> Optional[Material]:
    return db.query(Material).filter(Material.id == material_id, Material.user_id == user_id).first()


def create_material(db: Session, payload: MaterialCreate, user_id: int) -> Optional[Material]:
    """Retorna None se subject_id não pertence ao usuário (mesma validação usada em tasks/eventos)."""
    subject = db.query(Subject).filter(Subject.id == payload.subject_id, Subject.user_id == user_id).first()
    if not subject:
        return None

    db_material = Material(
        title=payload.title,
        category=payload.category,
        status=payload.status,
        url=payload.url,
        description=payload.description,
        subject_id=payload.subject_id,
        user_id=user_id,
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


def update_material(db: Session, material_id: int, update: MaterialUpdate, user_id: int) -> Optional[Material]:
    db_material = get_material_by_id(db, material_id, user_id)
    if not db_material:
        return None

    update_data = update.model_dump(exclude_unset=True)

    new_subject_id = update_data.get("subject_id")
    if "subject_id" in update_data:
        subject = db.query(Subject).filter(Subject.id == new_subject_id, Subject.user_id == user_id).first()
        if not subject:
            return None

    for key, value in update_data.items():
        setattr(db_material, key, value)

    db.commit()
    db.refresh(db_material)
    return db_material


def update_material_status(db: Session, material_id: int, status: str, user_id: int) -> Optional[Material]:
    db_material = get_material_by_id(db, material_id, user_id)
    if not db_material:
        return None
    db_material.status = status
    db.commit()
    db.refresh(db_material)
    return db_material


def delete_material(db: Session, material_id: int, user_id: int) -> bool:
    db_material = get_material_by_id(db, material_id, user_id)
    if not db_material:
        return False
    db.delete(db_material)
    db.commit()
    return True
