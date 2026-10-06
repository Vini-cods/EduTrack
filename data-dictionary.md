# EduTrack — Dicionário de Dados

Gerado a partir dos models SQLAlchemy em `backend/app/models/` (não é um
documento à parte da implementação — reflete exatamente o schema em uso).
Banco: SQLite (`backend/edutrack.db`), migrations via Alembic em
`backend/alembic/versions/`.

Convenção de enums: colunas marcadas "Enum (schema)" guardam uma string
simples e a validação do conjunto de valores acontece na camada Pydantic
(`backend/app/schemas/`), não no banco. Colunas marcadas "Enum (SQLAlchemy)"
usam `sa.Enum(..., native_enum=False)` e o banco grava o **nome** do membro
Python (maiúsculo, ex. `GITHUB`) — a API sempre expõe o **valor** (minúsculo,
ex. `github`), porque a conversão passa pelo ORM. Ver nota em "Observações".

---

## users

| Coluna | Tipo | Nulo | Default | Observações |
|---|---|---|---|---|
| id | Integer (PK) | não | autoincrement | |
| name | String(255) | não | — | |
| email | String(255) | não | — | único, indexado |
| hashed_password | String(255) | não | — | bcrypt via passlib |
| is_active | Boolean | não | `true` | não exposto na API hoje |
| created_at | DateTime(tz) | não | now() UTC | |
| updated_at | DateTime(tz) | não | now() UTC | atualizado on-update |

**Relacionamentos**: `subjects`, `tasks`, `calendar_events`, `study_sessions`,
`materials` — todos `cascade="all, delete-orphan"` (excluir o usuário apaga
tudo que é dele).

---

## subjects

| Coluna | Tipo | Nulo | Default | Observações |
|---|---|---|---|---|
| id | Integer (PK) | não | autoincrement | |
| user_id | Integer (FK → users.id) | não | — | `ondelete=CASCADE` |
| name | String(255) | não | — | |
| color | String(20) | sim | — | existe no model/schema; **sem UI para definir ainda** |
| professor | String(255) | sim | — | existe no model/schema; **sem UI para definir ainda** |
| workload_hours | Integer | sim | — | existe no model/schema; **sem UI para definir ainda** |
| description | String(1000) | sim | — | |
| start_date | Date | sim | — | existe no model/schema; **sem UI para definir ainda** |
| end_date | Date | sim | — | existe no model/schema; **sem UI para definir ainda** |
| created_at / updated_at | DateTime(tz) | não | now() UTC | |

**Relacionamentos**: `tasks` (cascade), `materials` (cascade),
`calendar_events` (sem cascade — `SET NULL`), `study_sessions` (sem cascade
— `SET NULL`).

---

## tasks

| Coluna | Tipo | Nulo | Default | Observações |
|---|---|---|---|---|
| id | Integer (PK) | não | autoincrement | |
| user_id | Integer (FK → users.id) | não | — | `ondelete=NO ACTION` (a cascata real acontece via subject) |
| subject_id | Integer (FK → subjects.id) | não | — | `ondelete=CASCADE` |
| title | String(255) | não | — | |
| description | String(1000) | sim | — | |
| due_date | Date | sim | — | prazo |
| status | String(20) | não | `pendente` | Enum (schema): `pendente`, `em_andamento`, `concluida` |
| priority | String(20) | não | `media` | Enum (schema): `baixa`, `media`, `alta`, `urgente` |
| estimated_hours | Float | sim | — | horas estimadas (Study Planner) |
| created_at / updated_at | DateTime(tz) | não | now() UTC | |

**Relacionamentos**: `calendar_events` (sem cascade — `SET NULL`),
`study_sessions` (sem cascade — `SET NULL`).

---

## calendar_events

| Coluna | Tipo | Nulo | Default | Observações |
|---|---|---|---|---|
| id | Integer (PK) | não | autoincrement | |
| user_id | Integer (FK → users.id) | não | — | `ondelete=CASCADE` |
| subject_id | Integer (FK → subjects.id) | sim | — | `ondelete=SET NULL` |
| task_id | Integer (FK → tasks.id) | sim | — | `ondelete=SET NULL`; preenchido quando é a sessão agendada de um objetivo do Study Planner |
| title | String(255) | não | — | |
| description | String(1000) | sim | — | |
| category | String(20) | não | `evento` | Enum (SQLAlchemy): `aula`, `prova`, `trabalho`, `estudo`, `evento` |
| location | String(255) | sim | — | |
| color | String(20) | sim | — | |
| start_datetime | DateTime(tz) | não | — | indexado |
| end_datetime | DateTime(tz) | sim | — | |
| recurrence_group_id | String(32) | sim | — | indexado; mesmo valor em todas as ocorrências de uma série recorrente (ver "Decisões de arquitetura") |
| created_at / updated_at | DateTime(tz) | não | now() UTC | |

**Relacionamentos**: nenhum filho (é sempre folha).

---

## study_sessions

| Coluna | Tipo | Nulo | Default | Observações |
|---|---|---|---|---|
| id | Integer (PK) | não | autoincrement | |
| user_id | Integer (FK → users.id) | não | — | `ondelete=CASCADE` |
| subject_id | Integer (FK → subjects.id) | sim | — | `ondelete=SET NULL` |
| task_id | Integer (FK → tasks.id) | sim | — | `ondelete=SET NULL` |
| status | String(20) | não | `em_andamento` | Enum (SQLAlchemy): `em_andamento`, `pausada`, `concluida` |
| started_at | DateTime(tz) | não | — | início da sessão |
| segment_started_at | DateTime(tz) | sim | — | início do segmento ativo atual; `null` quando pausada/concluída |
| accumulated_seconds | Integer | não | `0` | segundos ativos já fechados |
| ended_at | DateTime(tz) | sim | — | preenchido só ao concluir |
| pomodoro_cycles_completed | Integer | não | `0` | |
| created_at / updated_at | DateTime(tz) | não | now() UTC | |

**Campo calculado (não é coluna)**: `elapsed_seconds` — property Python no
model; `accumulated_seconds` congelado, ou `accumulated_seconds + (agora −
segment_started_at)` quando `em_andamento`. Ver "Decisões de arquitetura".

**Relacionamentos**: nenhum filho.

---

## materials

| Coluna | Tipo | Nulo | Default | Observações |
|---|---|---|---|---|
| id | Integer (PK) | não | autoincrement | |
| user_id | Integer (FK → users.id) | não | — | `ondelete=NO ACTION` |
| subject_id | Integer (FK → subjects.id) | **não** | — | `ondelete=CASCADE` — obrigatório, diferente de calendar_events/study_sessions |
| title | String(255) | não | — | |
| category | String(20) | não | `outro` | Enum (SQLAlchemy): `pdf`, `link`, `artigo`, `video`, `documentacao`, `github`, `anotacao`, `outro` |
| status | String(20) | não | `para_estudar` | Enum (SQLAlchemy): `para_estudar`, `estudando`, `concluido` |
| url | String(1000) | sim | — | sem upload de arquivo — só referência por link |
| description | String(1000) | sim | — | |
| created_at / updated_at | DateTime(tz) | não | now() UTC | |

**Relacionamentos**: nenhum filho.

---

## Diagrama de relacionamentos (resumo)

```
User 1──* Subject 1──* Task
                  │         │
                  │         ├──* CalendarEvent (subject_id e task_id opcionais, SET NULL)
                  │         └──* StudySession   (subject_id e task_id opcionais, SET NULL)
                  │
                  └──* Material (subject_id obrigatório, CASCADE)
```

---

## Decisões de arquitetura relevantes para o schema

- **Recorrência de CalendarEvent**: cada ocorrência é uma linha própria,
  materializada na criação (sem RRULE armazenada). Ver docstring de
  `models/calendar_event.py`.
- **Tempo de StudySession**: dois números (`accumulated_seconds` +
  `segment_started_at`) em vez de um log de eventos de pausa/retomada. Ver
  docstring de `models/study_session.py`.
- **Task vs. CalendarEvent vs. StudySession**: `Task`/`CalendarEvent`
  representam planejamento (o que pretendo estudar, quando pretendo
  sentar); `StudySession` representa execução real. Nenhuma entidade
  duplica campos de outra — todas referenciam via FK opcional.
- **Material sempre pertence a uma disciplina** (`subject_id` obrigatório,
  `CASCADE`) — diferente de `CalendarEvent`/`StudySession`, que podem
  existir sem disciplina.

## Observações / pontos em aberto

- Inconsistência de armazenamento bruto: colunas com `sa.Enum(..., native_enum=False)`
  (`calendar_events.category`, `study_sessions.status`, `materials.category`,
  `materials.status`) gravam o **nome** do enum Python em maiúsculas no
  SQLite; colunas de enum em `tasks` (`status`, `priority`) são `String`
  simples e gravam o **valor** em minúsculas. A API sempre expõe o valor em
  minúsculas em ambos os casos (a conversão acontece no ORM) — a diferença
  só aparece inspecionando o arquivo `.db` diretamente.
- `subjects.color`, `professor`, `workload_hours`, `start_date`, `end_date`
  existem no model e no schema Pydantic, mas nenhum formulário do frontend
  ainda permite defini-los.
