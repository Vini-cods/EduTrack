"""Importa todos os modelos para registro no Alembic."""

from app.models.user import User
from app.models.subject import Subject
from app.models.task import Task

__all__ = ["User", "Subject", "Task"]
