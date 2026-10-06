# EduTrack — Validação de CRUD e Ownership

Base: 78 testes automatizados (`backend/tests/`, pytest, banco SQLite em
memória isolado do `edutrack.db` real). Execução: `cd backend && pytest`.
Resultado atual: **78 passed**.

## Matriz de CRUD por entidade

| Entidade | Create | Read (lista) | Read (por id/subject) | Update | Delete | Isolamento testado |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Subject | ✅ | ✅ | ✅ | ✅ | ✅ (cascata) | ✅ (ver/editar/excluir de outro usuário → 404) |
| Task | ✅ | ✅ | ✅ (geral e por disciplina) | ✅ (PUT completo + PATCH status) | ✅ | ✅ |
| CalendarEvent | ✅ (única + série recorrente) | ✅ (com filtro de intervalo) | — | ✅ (ocorrência isolada) | ✅ (ocorrência isolada + série inteira) | ✅ |
| StudySession | ✅ (com checagem de conflito) | ✅ (histórico + ativa) | — | — (não editável, só transições de estado) | ✅ | ✅ |
| Material | ✅ | ✅ | ✅ (por disciplina) | ✅ (PUT completo + PATCH status) | ✅ | ✅ |

StudySession não tem "update" tradicional por decisão de design: o estado
muda só via `pause`/`resume`/`stop` (máquina de estados), não por PUT livre.

## Casos de erro validados

| Caso | Entidade(s) | Resultado esperado |
|---|---|---|
| Credencial inválida / token ausente | Auth | 401 |
| E-mail duplicado no registro | Auth | 400/409 |
| `subject_id`/`task_id` de outro usuário ou inexistente | Task, CalendarEvent, StudySession, Material | 404 |
| `priority`/`category`/`status` fora do enum | Task, CalendarEvent, Material | 422 |
| `estimated_hours <= 0` | Task | 422 |
| `recurrence.until` anterior à data de início | CalendarEvent | 422 |
| `materials.subject_id` ausente | Material | 422 (campo obrigatório) |
| Segunda `study_session` enquanto uma já está ativa/pausada | StudySession | 409 |
| `pause`/`resume`/`stop` em sessão já concluída | StudySession | 404 |
| `resume` em sessão que não está pausada (e vice-versa) | StudySession | 404 |
| Acesso/edição/exclusão de recurso de outro usuário | todas | 404 (nunca 403 — ownership não revela existência) |

## Comportamento de cascata validado com dados reais

| Ação | Efeito esperado | Testado |
|---|---|---|
| Excluir Subject | apaga Tasks e Materials da disciplina; CalendarEvents/StudySessions ficam com `subject_id=null` | ✅ |
| Excluir Task vinculada a um CalendarEvent | o evento sobrevive, `task_id` vira `null` | ✅ |
| Excluir Task vinculada a uma StudySession | a sessão sobrevive no histórico, `task_id` vira `null` | ✅ |

## Tempo real decorrido (StudySession)

Único conjunto de testes que usa `time.sleep()` real (não só chamadas
instantâneas), para confirmar a matemática de pausa/retomada:
- tempo congela durante pausa (reconfirmado após +1.5s parado);
- tempo soma corretamente entre dois segmentos ativos (antes e depois de um
  pause/resume);
- `elapsed_seconds` final no `stop` reflete a soma real dos segmentos.

## Fora do escopo desta auditoria

Testes de interface (clique em botão, renderização visual, responsividade)
não são automatizados — não há suíte de frontend (Vitest/RTL) neste
projeto. A verificação de UI é manual, guiada pelo `GUIA_DE_EXECUCAO_E_TESTES.md`.
A garantia automatizada cobre a camada de API (toda a lógica de negócio e
persistência) e a compilação do frontend (`tsc`/`vite build`).
