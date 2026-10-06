# EduTrack — Documentação da API

Base URL local: `http://localhost:8000/api/v1`
Documentação interativa (Swagger, gerada automaticamente pelo FastAPI):
`http://localhost:8000/docs`

Autenticação: **JWT Bearer**. Todas as rotas exceto `auth/register`,
`auth/login`, `auth/forgot-password` e `auth/reset-password` exigem o header
`Authorization: Bearer <token>`. O token é obtido em `POST /auth/login` e
tem validade configurada em `backend/app/core/config.py`.

Isolamento: toda consulta é filtrada por `user_id` do token — um usuário
nunca enxerga, edita ou apaga dado de outro (ver `crud-validation.md` para a
cobertura de testes disso).

---

## Auth

| Método | Rota | Body | Retorno | Observações |
|---|---|---|---|---|
| POST | `/auth/register` | `{name, email, password}` | `UserResponse` | não retorna token — logar depois |
| POST | `/auth/login` | form-encoded `username, password` (não JSON) | `{access_token, token_type}` | `username` = email |
| GET | `/auth/me` | — | `UserResponse` | requer token |
| POST | `/auth/forgot-password` | `{email}` | 200 sempre | não revela se o e-mail existe |
| POST | `/auth/reset-password` | `{token, new_password}` | 200 | |

---

## Subjects (`/subjects`)

| Método | Rota | Body | Retorno |
|---|---|---|---|
| GET | `/subjects/` | — | `[SubjectWithProgress]` (inclui `progress`, `total_tasks`, `completed_tasks`) |
| GET | `/subjects/{id}` | — | `SubjectWithProgress` |
| POST | `/subjects/` | `{name, description?, color?, professor?, workload_hours?, start_date?, end_date?}` | `SubjectResponse` (201, **sem** `progress`) |
| PUT | `/subjects/{id}` | campos parciais | `SubjectResponse` |
| DELETE | `/subjects/{id}` | — | 204. Cascata: apaga `tasks` e `materials`; `calendar_events`/`study_sessions` ficam com `subject_id=null`. |

---

## Tasks (`/tasks`)

| Método | Rota | Body | Retorno |
|---|---|---|---|
| GET | `/tasks/` | — | `[TaskWithSubject]` (todas as disciplinas, já com `subject_name`/`subject_color`, ordenado por `due_date` asc com nulos por último) |
| GET | `/tasks/subject/{subject_id}` | — | `[TaskResponse]` (só dessa disciplina) |
| GET | `/tasks/{id}` | — | `TaskResponse` |
| POST | `/tasks/` | `{title, subject_id, description?, due_date?, status?, priority?, estimated_hours?}` | `TaskResponse` (201). 404 se `subject_id` não é do usuário. |
| PUT | `/tasks/{id}` | campos parciais (inclui `priority`, `estimated_hours`) | `TaskResponse` |
| PATCH | `/tasks/{id}/status` | `{status}` | `TaskResponse` |
| DELETE | `/tasks/{id}` | — | 204. Cascata: `calendar_events`/`study_sessions` vinculados ficam com `task_id=null`. |

Validação: `priority` ∈ `{baixa, media, alta, urgente}`; `estimated_hours`
deve ser `> 0` quando informado (422 caso contrário).

---

## Calendar Events (`/calendar-events`)

| Método | Rota | Body | Retorno |
|---|---|---|---|
| GET | `/calendar-events/?start=&end=` | — | `[CalendarEventWithSubject]` (filtra por `start_datetime` dentro do intervalo; sem params, traz tudo) |
| POST | `/calendar-events/` | `{title, start_datetime, category?, subject_id?, task_id?, description?, location?, color?, end_datetime?, recurrence?}` | `{events: [...], recurrence_group_id}` (201) |
| PUT | `/calendar-events/{id}` | campos parciais (uma ocorrência só) | `CalendarEventResponse` |
| DELETE | `/calendar-events/{id}` | — | 204 (uma ocorrência só) |
| DELETE | `/calendar-events/series/{recurrence_group_id}` | — | 204 (todas as ocorrências da série) |

**`recurrence` (opcional, só na criação)**:
```json
{"type": "daily" | "weekly", "days_of_week": [0..6] | null, "until": "YYYY-MM-DD"}
```
`days_of_week`: 0=segunda…6=domingo, obrigatório para `weekly`. `until` não
pode ser anterior à data de início (422). Máximo de 260 ocorrências geradas
por série (proteção contra `until` muito distante).

---

## Study Sessions (`/study-sessions`)

Máquina de estados: `em_andamento` → `pausada` ⇄ `em_andamento` →
`concluida` (terminal). Só pode existir **uma** sessão ativa/pausada por
usuário por vez.

| Método | Rota | Body | Retorno |
|---|---|---|---|
| GET | `/study-sessions/active` | — | `StudySessionWithContext \| null` |
| GET | `/study-sessions/` | — | `[StudySessionWithContext]` (histórico completo, mais recente primeiro) |
| POST | `/study-sessions/` | `{subject_id?, task_id?}` | `StudySessionResponse` (201). **409** se já existe sessão ativa/pausada. |
| PATCH | `/study-sessions/{id}/pause` | — | `StudySessionResponse`. 404 se não está `em_andamento`. |
| PATCH | `/study-sessions/{id}/resume` | — | `StudySessionResponse`. 404 se não está `pausada`. |
| PATCH | `/study-sessions/{id}/stop` | `{pomodoro_cycles_completed}` | `StudySessionResponse` (status vira `concluida`). 404 se já finalizada. |
| DELETE | `/study-sessions/{id}` | — | 204 |

`elapsed_seconds` no retorno é calculado (não é coluna) — ver
`data-dictionary.md`.

---

## Materials (`/materials`)

| Método | Rota | Body | Retorno |
|---|---|---|---|
| GET | `/materials/` | — | `[MaterialWithSubject]` |
| GET | `/materials/subject/{subject_id}` | — | `[MaterialResponse]` |
| POST | `/materials/` | `{title, subject_id, category?, status?, url?, description?}` | `MaterialResponse` (201). `subject_id` obrigatório (422 se ausente); 404 se não é do usuário. |
| PUT | `/materials/{id}` | campos parciais | `MaterialResponse` |
| PATCH | `/materials/{id}/status` | `{status}` | `MaterialResponse` |
| DELETE | `/materials/{id}` | — | 204 |

---

## Dashboard (`/dashboard`)

| Método | Rota | Retorno |
|---|---|---|
| GET | `/dashboard/` | `{total_subjects, total_tasks, tasks_pending, tasks_in_progress, tasks_completed, overall_progress, subjects_progress: [...]}` |

Agregado somente a partir de `tasks`/`subjects` do usuário — não usa
`calendar_events`/`study_sessions`/`materials` (o frontend busca essas
separadamente onde precisa, ex. Dashboard/Study Planner/Focus Mode).

---

## Códigos de erro usados

| Código | Significado neste projeto |
|---|---|
| 401 | credenciais inválidas / token ausente ou inválido |
| 404 | recurso não existe **ou** não pertence ao usuário autenticado (isolamento por ownership, não por 403) |
| 409 | conflito de estado (ex.: já existe `study_session` ativa) |
| 422 | validação Pydantic (enum inválido, `estimated_hours <= 0`, `recurrence.until` antes do início, `materials.subject_id` ausente etc.) |
