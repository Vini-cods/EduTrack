"""add task priority, estimated_hours and calendar_event task_id

Revision ID: 64de913a920e
Revises: 96fdd9a96d98
Create Date: 2026-09-14 00:38:23.957063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '64de913a920e'
down_revision: Union[str, None] = '96fdd9a96d98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite não suporta ALTER TABLE para adicionar constraints (FK) nem
    # sempre lida bem com ADD COLUMN em todas as variações — por isso o uso
    # de batch mode (cria tabela nova com o schema alvo, copia os dados,
    # troca), que é a forma recomendada pelo próprio Alembic para SQLite.
    #
    # server_default='media' em `priority` é essencial aqui: a tabela `tasks`
    # já tem linhas reais, e a coluna é NOT NULL — sem um default no nível do
    # banco, a migration falharia ao tentar preencher as linhas existentes.
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('priority', sa.String(length=20), nullable=False, server_default='media'))
        batch_op.add_column(sa.Column('estimated_hours', sa.Float(), nullable=True))

    with op.batch_alter_table('calendar_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('task_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_calendar_events_task_id'), ['task_id'], unique=False)
        batch_op.create_foreign_key(
            batch_op.f('fk_calendar_events_task_id_tasks'), 'tasks', ['task_id'], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    with op.batch_alter_table('calendar_events', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_calendar_events_task_id_tasks'), type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_calendar_events_task_id'))
        batch_op.drop_column('task_id')

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('estimated_hours')
        batch_op.drop_column('priority')
