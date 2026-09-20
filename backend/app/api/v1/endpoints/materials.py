from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.material import (
    MaterialCreate,
    MaterialUpdate,
    MaterialStatusUpdate,
    MaterialResponse,
    MaterialWithSubject,
)
from app.services import material_service

router = APIRouter()


@router.get("/", response_model=List[MaterialWithSubject])
def read_materials(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Todos os materiais do usuário, de todas as disciplinas."""
    return material_service.get_materials_for_user(db=db, user_id=current_user.id)


@router.get("/subject/{subject_id}", response_model=List[MaterialResponse])
def read_materials_by_subject(
    subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Materiais de uma disciplina específica — usado em SubjectDetail."""
    return material_service.get_materials_by_subject(db=db, subject_id=subject_id, user_id=current_user.id)


@router.post("/", response_model=MaterialResponse, status_code=201)
def create_material(
    material: MaterialCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db_material = material_service.create_material(db=db, payload=material, user_id=current_user.id)
    if not db_material:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    return db_material


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    material_update: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = material_service.update_material(db=db, material_id=material_id, update=material_update, user_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    return updated


@router.patch("/{material_id}/status", response_model=MaterialResponse)
def update_material_status(
    material_id: int,
    status_update: MaterialStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = material_service.update_material_status(
        db=db, material_id=material_id, status=status_update.status, user_id=current_user.id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    return updated


@router.delete("/{material_id}", status_code=204)
def delete_material(material_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = material_service.delete_material(db=db, material_id=material_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    return None
