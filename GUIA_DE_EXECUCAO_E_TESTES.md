# EduTrack — Guia de Execução e Testes

> Documentação complementar gerada na auditoria final: `data-dictionary.md`
> (schema do banco), `api-documentation.md` (todas as rotas), `crud-validation.md`
> (cobertura de testes/ownership) e `openspec.md` (verificação de estrutura
> OpenSpec — não encontrada neste projeto).

Este guia parte do zero: clonar/extrair o projeto, instalar tudo, rodar backend e
frontend, testar e validar. Todos os comandos abaixo assumem que você está na
raiz do projeto (a pasta `EduTrack/`, com `backend/` e `frontend/` dentro dela).

---

## 1. Pré-requisitos e versões esperadas

| Ferramenta | Versão usada nesta entrega | Observação |
|---|---|---|
| Python | 3.12.x | 3.11+ deve funcionar; abaixo de 3.11 não foi testado |
| Node.js | 22.x | 20+ deve funcionar (exigido pelo Tailwind v4) |
| npm | 10.x | vem junto com o Node |
| SQLite | — | não precisa instalar nada; vem embutido no Python |

Não é necessário instalar SQL Server/ODBC — o projeto já vem configurado para
SQLite por padrão, que funciona sem nenhuma instalação extra. (SQL Server é
suportado como alternativa via `DB_ENGINE=mssql` no `.env`, mas exige SQL
Server Express + ODBC Driver 18 instalados à parte — não é o caminho
recomendado para revisão local.)

---

## 2. Instalar dependências

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt --break-system-packages   # ou sem a flag, se seu pip não exigir
```

### Frontend

```bash
cd frontend
npm install
```

---

## 3. Variáveis de ambiente

O arquivo `backend/.env` **já vem preenchido** nesta entrega (inclusive com o
`SECRET_KEY` que já estava em uso) — você não precisa configurar nada para
rodar localmente. `backend/.env.example` documenta cada variável, caso queira
gerar as suas do zero:

```bash
cd backend
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # gera um novo SECRET_KEY
# cole o resultado em SECRET_KEY dentro do .env
```

Por padrão `DB_ENGINE=sqlite` e `SQLITE_PATH=edutrack.db` — não mude nada aqui
a menos que queira testar contra SQL Server.

O frontend não exige `.env` para rodar local: por padrão ele fala com
`http://localhost:8000/api/v1` (ver `frontend/src/api/client.ts`). Só crie um
`frontend/.env` com `VITE_API_URL=...` se for apontar para um backend em outro
endereço.

---

## 4. Banco de dados

Esta entrega já inclui `backend/edutrack.db` com **todas as migrations
aplicadas** e os dados que já existiam no seu projeto (sua conta e as tarefas
que você já tinha criado) — não precisa rodar nada para começar a usar.

Se preferir começar com um banco limpo (do zero):

```bash
cd backend
rm edutrack.db
alembic upgrade head
```

Isso recria o schema inteiro (users, subjects, tasks, calendar_events,
study_sessions, materials) vazio, pronto para registrar um usuário novo.

Para conferir em qual migration o banco está:

```bash
alembic current   # deve mostrar "ebf926553436 (head)"
alembic history    # mostra a cadeia completa de migrations
```

---

## 5. Rodando o projeto

**Backend** (a partir de `backend/`, com o venv ativado):

```bash
uvicorn app.main:app --reload --port 8000
```

**Frontend** (a partir de `frontend/`, em outro terminal):

```bash
npm run dev
```

### URLs

| Serviço | URL |
|---|---|
| Frontend (app) | http://localhost:5173 |
| Backend (API) | http://localhost:8000/api/v1 |
| Documentação interativa da API (Swagger) | http://localhost:8000/docs |

O CORS do backend já está liberado para `http://localhost:5173`, então não
precisa configurar nada extra para o frontend conseguir chamar a API.

---

## 6. Credenciais para testar

Sua conta real (`vinicius.briches@aluno.impacta.edu.br`) continua no banco
com as tarefas que você já tinha — mas eu nunca tive acesso à sua senha (só
ao hash), então não tenho como te passar essa credencial. Duas formas de
entrar:

1. **Use a senha que você já sabe** com o e-mail acima, se lembrar.
2. **Crie uma conta nova** pela tela de registro (`/register`) — rápido e
   testa o fluxo de cadastro real.

(O EduTrack não possui mais modo visitante/convidado — essa opção foi
removida nesta rodada de refinamento.)

---

## 7. Rodando a suíte de testes do backend

```bash
cd backend
pytest
```

Saída esperada: **78 testes, todos passando** (mais alguns avisos de
`DeprecationWarning` do `datetime.utcnow()`, que não afetam o resultado — é
um aviso pré-existente do código de geração de JWT, não um erro).

Os testes rodam contra um banco SQLite **em memória**, completamente isolado
do `edutrack.db` real — pode rodar `pytest` quantas vezes quiser sem risco
de mexer nos seus dados.

Cobertura por arquivo:

| Arquivo | O que cobre |
|---|---|
| `test_auth.py` | registro, login, credenciais inválidas, rota protegida |
| `test_subjects.py` | CRUD, progresso calculado, isolamento entre usuários |
| `test_tasks.py` | CRUD, priority/estimated_hours, ordenação, isolamento |
| `test_calendar_events.py` | evento único, série recorrente (contagem exata de ocorrências), vínculo com task, exclusão de série, isolamento |
| `test_study_sessions.py` | máquina de estados start/pause/resume/stop **com tempo real decorrido**, conflito de sessão dupla, cascata ao excluir task vinculada, isolamento |
| `test_materials.py` | CRUD, cascata ao excluir disciplina, isolamento |
| `test_dashboard.py` | agregados de tarefas/disciplinas, isolamento |

Para rodar só um arquivo ou um teste específico:

```bash
pytest tests/test_study_sessions.py
pytest tests/test_study_sessions.py::test_pause_freezes_elapsed_time
pytest -v          # saída detalhada, teste por teste
```

---

## 8. Type-check e build do frontend

```bash
cd frontend
npx tsc --noEmit      # type-check isolado, sem gerar arquivos
npm run build          # type-check + build de produção (mesmo comando do CI/deploy)
```

Resultado esperado: nenhum erro de TypeScript; o build termina com um aviso
de tamanho de bundle (~915KB) sugerindo `code-splitting` — é um aviso de
performance conhecido, não um erro (ver seção de pontos em aberto abaixo).

```bash
npm run preview        # serve o build de produção localmente, se quiser conferir
```

---

## 9. Principais fluxos para testar manualmente

Sugestão de ordem, encadeando os dados de um fluxo no outro:

1. **Auth**: registre uma conta nova (`/register`), saia e entre de novo
   (`/login`) com essas credenciais.
2. **Subjects**: crie 2–3 disciplinas em `/subjects`.
3. **Tasks**: em `/tasks`, crie tarefas com prioridade e prazo variados;
   marque uma como concluída; troque o status pelo seletor; use o ícone de
   lápis para editar título, descrição, disciplina, prazo, prioridade,
   status e horas estimadas de uma tarefa já existente; confira os estados
   visuais de prazo (atrasada/hoje/próximo/sem prazo); teste os filtros
   (Hoje/Semana/Atrasadas/Concluídas) e a ordenação por prioridade. Repita a
   criação/edição de tarefa (agora também com prazo e prioridade) dentro de
   uma disciplina em `/subjects/:id`.
4. **Dashboard**: volte para `/dashboard` e confira se "Hoje", "Próximos
   prazos", "Progresso" e "Carga da semana" refletem o que você acabou de
   criar.
5. **Calendar**: em `/calendar`, crie um evento único e depois um evento
   recorrente (ex.: toda segunda e quarta) — confira nas 3 visões (Mês,
   Semana, Dia); edite e exclua uma ocorrência isolada; exclua a série
   inteira.
6. **Study Planner**: em `/study`, crie um objetivo de estudo (com tempo
   estimado e prioridade) vinculado a uma disciplina; agende uma sessão no
   calendário a partir dele; confira o link "Ver no calendário".
7. **Focus Mode**: clique em "Focar" num objetivo do Study Planner (ou
   "Iniciar foco" direto); rode um ciclo Pomodoro completo (ou ajuste os
   minutos na configuração para testar mais rápido); pause e retome
   manualmente; finalize e confira se a sessão aparece no histórico com a
   duração certa.
8. **Materials**: em `/materials`, adicione materiais de tipos diferentes
   (PDF, link, vídeo, anotação) para uma disciplina; teste os filtros por
   disciplina/tipo/status; confira que os mesmos materiais aparecem na aba
   "Materiais" dentro de `SubjectDetail` (`/subjects/:id`).
9. **Command Palette**: `Ctrl+K` (ou `Cmd+K`) em qualquer tela — teste
   navegação e as ações rápidas ("Nova tarefa", "Novo evento", "Novo
   objetivo de estudo", "Novo material").
10. **Responsividade**: redimensione a janela (ou abra as ferramentas de
    dispositivo do navegador) para conferir a sidebar virando drawer no
    mobile e os grids se reorganizando.

---

## 10. Portas e URLs — resumo rápido

| O quê | Onde |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend / API | `http://localhost:8000/api/v1` |
| Swagger (docs da API) | `http://localhost:8000/docs` |
| Banco (arquivo) | `backend/edutrack.db` (SQLite) |

---

## 11. Pontos em aberto (para referência durante a revisão)

Já sinalizados nas etapas anteriores, continuam válidos:

- **Inconsistência de armazenamento de enum**: `CalendarEvent`, `StudySession`
  e `Material` gravam o *nome* do enum em maiúsculas no banco (`'GITHUB'`),
  enquanto `Task` grava o *valor* em minúsculas (`'media'`) — ambos
  funcionam corretamente pela API (todo o acesso passa pelo ORM), a
  diferença só aparece inspecionando o banco direto.
- **Bundle do frontend sem code-splitting** (~915KB) — item já mapeado para
  a etapa de performance do roadmap original.
- **Materials é só por URL, sem upload de arquivo** — não há infraestrutura
  de armazenamento de arquivo em nenhuma parte do backend.
- **Campos do Subject ainda sem UI**: `professor`, `workload_hours`,
  `start_date`, `end_date`, `color` já existem no model/schema mas nenhum
  formulário permite defini-los ainda.
