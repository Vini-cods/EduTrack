# EduTrack

Plataforma de organização acadêmica para estudantes universitários e de cursos técnicos. Reúne prazos, aulas, planejamento, estudo realizado e conhecimento por disciplina para ajudar a decidir **o que fazer hoje** e ajustar a carga dos próximos dias.

Este README é a referência principal de instalação, arquitetura e uso técnico. O [estado de desenvolvimento](docs/DEVELOPMENT_STATUS.md) registra as validações realizadas, decisões recentes e próximas prioridades.

O [OpenSpec — backlog e especificações](openspec.md) reúne a evolução por commit, os módulos e contratos implementados, as decisões técnicas e as pendências com critérios de conclusão. Cada edição fixa um corte do histórico para manter a rastreabilidade.

## O produto

| Área | O que está implementado |
|---|---|
| Dashboard | Próximo passo explicável pelo horário/prioridade, agenda, mapa semanal de prazos, comparação de estudo, diagnóstico do planejamento e gráficos de estudo/carga. |
| Disciplinas | Cadastro, edição e exclusão; professor, carga horária, período, cronograma de aulas, plano de ensino e avaliações. |
| Tarefas | Prioridade, prazo, estimativa, status, filtros e ações de edição/exclusão. Tarefas com data aparecem como prazos no calendário. |
| Calendário | Visões mês/semana/dia, eventos por categoria, vínculos com tarefas e recorrência; exclusão de uma ocorrência ou da série. |
| Study Planner e Focus | Objetivos, reserva de blocos, Pomodoro, pausa/retomada e segmentos ativos para distribuir estudo entre dias. |
| Notes e Materials | Anotações de texto simples com tags e contexto; referências de estudo por URL, disciplina e status; busca sem acentos e paginação no servidor. |
| Academic Load e Insights | Comparação de intervalos equivalentes, calendário de consistência, padrões de sessões por dia/hora, média/mediana, cobertura do planejamento, sobrecarga, distribuição por disciplina e exportação CSV. |
| Navegação e aparência | Command Palette (`Ctrl+K`/`Cmd+K`) com busca; o tema claro/escuro/sistema escolhido no acesso continua no vídeo e no Dashboard e sincroniza com a conta; capacidade/Pomodoro persistidos por conta; layout responsivo e respeito a `prefers-reduced-motion`. |
| Acesso | Login e cadastro em etapas; autenticação JWT e recuperação de senha por e-mail quando SMTP estiver configurado. |

## Stack e requisitos

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, Axios, React Hook Form, Zod, Recharts e Lucide React. |
| Backend | Python, FastAPI, SQLAlchemy 2, Pydantic 2, Alembic, python-jose e Passlib/bcrypt. |
| Persistência | SQLite no ambiente validado; migrations versionadas no Alembic. |
| Testes | pytest/HTTPX na API e testes de regras do frontend pelo runner nativo do Node. |

Use **Python 3.11 ou superior** e **Node.js 22.16 ou superior**, com npm. O ambiente de desenvolvimento foi validado com Python 3.11.9 e Node 22.16.0. SQLite acompanha o Python; não é necessário instalar um servidor de banco para executar localmente. As dependências exatas estão em [backend/requirements.txt](backend/requirements.txt) e [frontend/package-lock.json](frontend/package-lock.json).

## Executar localmente

Os comandos abaixo usam PowerShell e partem da raiz do repositório. Em macOS/Linux, use `python3`, o interpretador `venv/bin/python` e `cp` no lugar de `Copy-Item`.

### 1. Preparar a API

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"
```

O último comando gera uma chave nova. Edite `backend/.env`, substitua o valor de `SECRET_KEY` pela chave gerada e mantenha `DB_ENGINE=sqlite` e `SQLITE_PATH=edutrack.db` para o ambiente local. **Não sobrescreva um `.env` existente** ao atualizar uma instalação. A chave é obrigatória; o backend não usa uma chave fixa de desenvolvimento como fallback.

Sem SMTP, é possível testar todas as demais áreas; a recuperação de senha informa indisponibilidade em vez de simular um envio. A configuração de transporte e os limites desse fluxo estão em [Recuperação de senha](docs/PASSWORD_RECOVERY.md).

Crie ou atualize o schema e inicie a API, ainda em `backend`:

```powershell
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Em um banco existente, siga antes o procedimento de preservação de dados abaixo. Execute a API e o Alembic a partir de `backend`: o `.env` e o caminho SQLite relativo são resolvidos a partir do diretório de execução.

### 2. Preparar a interface

Abra outro terminal na raiz do repositório:

```powershell
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

O frontend usa `http://localhost:8000/api/v1` por padrão. Para outro endereço, crie `frontend/.env` com a configuração abaixo e reinicie o Vite:

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
```

Variáveis `VITE_*` são públicas no bundle; não coloque segredos nelas. O CORS do backend aceita `http://localhost:5173` por padrão. Para outra origem, configure `BACKEND_CORS_ORIGINS` no `.env` do backend como uma lista JSON de origens autorizadas e reinicie a API.

| Serviço | Endereço local |
|---|---|
| Aplicação | [localhost:5173](http://localhost:5173) |
| API | [localhost:8000/api/v1](http://localhost:8000/api/v1) |
| Swagger | [localhost:8000/docs](http://localhost:8000/docs) |
| OpenAPI JSON | [localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json) |

Em uma instalação nova, crie sua conta em `/register`, entre e cadastre as disciplinas. Não há credenciais compartilhadas ou conta visitante incluídas no repositório.

## Banco de dados e migrations

O arquivo `backend/edutrack.db`, os `.env` e os backups são locais e ficam fora do Git. As migrations em [backend/alembic/versions](backend/alembic/versions) são a fonte versionada de evolução do schema.

```powershell
# Executar em backend
.\venv\Scripts\python.exe -m alembic current
.\venv\Scripts\python.exe -m alembic heads
.\venv\Scripts\python.exe -m alembic history
```

Antes de atualizar dados em uso:

1. Pare os processos que escrevem no banco e faça um backup consistente. Para SQLite com conexões abertas, use a API de backup do SQLite em vez de copiar somente o arquivo principal.
2. Teste `alembic upgrade head` em uma cópia, usando `SQLITE_PATH` apontado explicitamente para essa cópia. Confira os registros preservados e execute `PRAGMA foreign_key_check`.
3. Aplique a migration no banco de uso real apenas após a validação. Preserve o backup até conferir os fluxos da aplicação.

A cadeia cria o schema desde um banco vazio e reconhece a revisão legada `079be52cae26`; não é necessário editar `alembic_version` manualmente. As migrations de unicidade interrompem a atualização se houver aulas idênticas ou múltiplas sessões ativas por usuário. Esses registros precisam ser revisados explicitamente; a migration não escolhe dados para apagar. A revisão atual e as evidências de preservação constam no [estado de desenvolvimento](docs/DEVELOPMENT_STATUS.md#banco-e-compatibilidade).

Existe configuração para SQL Server (`DB_ENGINE=mssql`, via `pyodbc` e driver ODBC), mas as migrations e cascatas recentes foram homologadas em SQLite. SQL Server exige infraestrutura e validação próprias antes de uso.

## Arquitetura e modelo acadêmico

```text
backend/
  app/api/          Rotas, dependências e autenticação da requisição
  app/schemas/      Contratos e validação Pydantic
  app/models/       Entidades e relacionamentos SQLAlchemy
  app/services/     Casos de uso, ownership e cálculos acadêmicos
  app/core/         Configuração, tokens e senhas
  app/db/           Engine, sessão e metadata
  alembic/          Histórico de migrations
  tests/           Contratos, regras, isolamento e regressões
frontend/
  src/api/         Cliente HTTP e operações por domínio
  src/hooks/       Carregamento, estado e coordenação dos fluxos
  src/lib/         Regras, projeções e formatação reutilizáveis
  src/types/       Contratos TypeScript
  src/components/  Componentes de UI e de domínio
  src/pages/       Composição das telas e rotas
  src/contexts/    Autenticação, tema e breadcrumbs
  tests/           Testes de regras sem depender do navegador
```

As páginas internas carregam por rota. Regras compartilhadas ficam nos serviços do backend e em módulos/hooks do frontend, evitando cálculos independentes para a mesma informação.

| Entidade | Responsabilidade |
|---|---|
| `User` | Proprietário dos dados e credenciais de acesso. |
| `Subject` | Contexto acadêmico: disciplina, professor, carga horária e período. |
| `Task` | Intenção ou entrega: prioridade, estimativa, prazo e estado. |
| `CalendarEvent` | Reserva de horário ou compromisso; pode referenciar disciplina/tarefa. |
| `StudySession` | Execução: tempo ativo acumulado, segmento atual e estado da sessão. |
| `StudySegment` / `TaskStatusEvent` | Intervalos ativos fechados e mudanças de status com instante UTC; histórico prospectivo, sem inferir datas antigas. |
| `UserPreferences` | Tema, capacidade diária e configurações Pomodoro do proprietário. |
| `Note` | Conhecimento em texto simples, com vínculos opcionais e tags. |
| `Material` | Referência de estudo obrigatoriamente vinculada a uma disciplina. |
| `SubjectSyllabus` / `Assessment` | Plano de ensino e resultados de avaliações por disciplina. |

Planejamento, agenda e execução permanecem separados: uma sessão de estudo finalizada não conclui automaticamente sua tarefa. Os prazos exibidos no calendário são uma **projeção de Task**, sem criar uma segunda cópia no banco. A recorrência materializa ocorrências com `recurrence_group_id`, preservando consultas simples e permitindo excluir uma ocorrência ou a série.

O timer calcula tempo a partir do segmento ativo e dos segundos acumulados, sem depender de contadores incrementados pela UI. Só uma sessão ativa/pausada por usuário é permitida. Fechar um segmento e mudar o estado é uma transação com atualização condicional, evitando dupla contabilização em disputas entre abas. Conclusões e reaberturas de tarefas também são registradas atomicamente; reenviar o mesmo estado não cria outro evento. Excluir uma tarefa/sessão remove seus eventos/segmentos correspondentes. A rede de partículas do acesso é isolada em Canvas 2D, com limite de densidade/DPR/quadros, pausa em aba oculta e quadro estático quando há preferência por movimento reduzido.

Ao excluir uma disciplina, suas tarefas, materiais, plano e avaliações são removidos; eventos, sessões e Notes são preservados sem os vínculos removidos. Excluir uma tarefa preserva eventos, sessões, Notes e resultados de avaliação, desvinculando a tarefa. O modelo, as constraints e os detalhes dos campos estão em [backend/app/models](backend/app/models) e nas migrations, evitando manter dicionários manuais divergentes.

## API e autenticação

O contrato completo de rotas, parâmetros, schemas e respostas é gerado pelo FastAPI no [Swagger local](http://localhost:8000/docs). Os grupos publicados incluem `auth`, `subjects`, `academic-records`, `tasks`, `dashboard`, `calendar-events`, `study-sessions`, `materials`, `notes`, `analytics` e `preferences`. Swagger/OpenAPI públicos ficam desabilitados em produção.

`POST /api/v1/auth/login` recebe formulário `application/x-www-form-urlencoded`, com `username` representando o e-mail e `password`; retorna um JWT Bearer. Cadastro, pedido de recuperação e redefinição são públicos. As demais operações acadêmicas exigem autenticação e filtram os dados pelo proprietário. Recurso inexistente ou de outro usuário retorna `404`; token inválido, `401`; conflito de estado, `409`; erro de validação, `422`.

O frontend armazena o token de acesso em `localStorage` e o envia no header `Authorization`. Não há refresh token nem revogação imediata das sessões existentes após redefinir a senha; os tokens já emitidos expiram conforme a configuração. Os detalhes de `202`/`429`/`503` da recuperação e de entrega SMTP estão no [guia operacional](docs/PASSWORD_RECOVERY.md).

## Validação

```powershell
# Backend: executar em backend
.\venv\Scripts\python.exe -m pytest -q

# Frontend: executar em frontend
npm run typecheck
npm test
npm run build
```

Os testes de API usam SQLite em memória, com dependência de banco substituída e schema recriado por teste. Não operam no banco pessoal. A suíte cobre contratos, isolamento entre usuários, regras de vínculo/exclusão, sessões, calendário, Notes, registros acadêmicos e analytics. Os testes do frontend verificam regras de domínio e regressões pelo runner nativo do Node; **não são uma suíte automatizada de cliques no navegador**.

Após mudanças de interface, confira também teclado/foco, loading/erro/vazio, mobile, temas e movimento reduzido no navegador. Para mudanças de schema, a verificação em cópia e a preservação de dados complementam os testes. Quantidades aprovadas e evidências da última execução ficam no [estado de desenvolvimento](docs/DEVELOPMENT_STATUS.md#validação-e-execução), sem tratar um build bem-sucedido como validação completa de produto.

## Metodologia e limites atuais

- A carga acadêmica soma compromissos com duração e esforço estimado ainda não coberto por estudo realizado ou blocos futuros vinculados. Tarefas sem prazo/estimativa são sinalizadas; o valor exibido não representa esforço que nunca foi informado.
- Analytics usa o fuso IANA informado. Eventos do calendário representam hora civil local; sessões usam UTC. Novos segmentos ativos são repartidos à meia-noite local, descontando pausas e respeitando mudanças de horário. Minutos legados sem intervalos conhecidos ficam no dia de início e são identificados como aproximados. `completed_at` e eventos de status passam a ser registrados; tarefas antigas concluídas mantêm data desconhecida. A taxa de entregas pelo prazo continua separada do histórico de conclusões/reaberturas, inclusive de tarefas sem prazo.
- As médias de avaliações usam notas informadas normalizadas em 0–10 e ponderadas pelos pesos, com cobertura dos pesos das avaliações que já receberam nota. São médias parciais de acompanhamento, sem representar regras oficiais de aprovação ou recuperação.
- Tema, capacidade e configurações Pomodoro são carregados da conta ao entrar/recarregar e salvos por PATCH parcial, com erro/retry e cache isolado por usuário. Não há atualização em tempo real entre dispositivos. O tema anônimo e o estado executivo do timer permanecem locais; configurações globais antigas não são importadas sem proprietário conhecido. Se o navegador for suspenso, a sessão no servidor continua ativa até receber a pausa/finalização.
- Notes usa texto simples. Materials armazena URLs/referências, sem upload. As páginas usam 20 registros e filtros no servidor; `/notes/page` e `/materials/page` aceitam até 50 registros. A Palette busca até 5 resultados de Notes/Materials por termo, transferindo apenas resumo das notas; disciplinas/tarefas continuam em snapshot por abertura. A busca Unicode sem acentos é por substring e ainda varre os registros do proprietário: não é um índice full-text. Endpoints antigos de listas continuam compatíveis.
- A grade de aulas materializa até 260 ocorrências em uma janela de até 366 dias. Edição altera uma ocorrência; para substituir a grade, remova a série e cadastre outra. Feriados são ajustados manualmente.
- Recuperação usa outbox persistente, worker separado, retry e rate limit compartilhado no banco. Foi validada com SMTP local; provedor/remetente/domínio reais ainda precisam de configuração. A entrega é pelo menos uma vez, e aceitação SMTP não comprova chegada à caixa de entrada. Consulte os limites e comandos no [guia operacional](docs/PASSWORD_RECOVERY.md).

## Preparar produção sem publicar

Os modelos em `backend/deploy` incluem proxy HTTPS/Caddy, serviços separados de API/worker e configuração de logs. `ENVIRONMENT=production` valida segredo, HTTPS/CORS, hosts explícitos e SMTP com TLS; não reutilize credenciais locais nem exponha Uvicorn diretamente. `/health/live` verifica o processo e `/health/ready` verifica banco/schema operacional. A configuração e as limitações de monitoramento estão no [guia operacional](docs/PASSWORD_RECOVERY.md#produção-e-monitoramento). Os exemplos não foram instalados nem publicados.

O utilitário `backend/scripts/sqlite_backup.py` permite `backup`, `verify` e `restore` para destino novo, usando snapshot online do SQLite, manifesto SHA-256 e verificação de integridade. Veja os [comandos e ensaio de restauração](docs/PASSWORD_RECOVERY.md#backup-sqlite-e-ensaio-de-restauração). Backups, agendamento, retenção e armazenamento externo precisam ser configurados no host escolhido; não ficam no Git.

As próximas evoluções incluem homologar a infraestrutura escolhida, aprofundar QA/acessibilidade e, conforme necessidade de produto, regras institucionais de avaliações ou índice full-text. O escopo atualizado está no [estado de desenvolvimento](docs/DEVELOPMENT_STATUS.md#próximas-evoluções).

## Solução de problemas

| Sintoma | Verificação |
|---|---|
| Erro de configuração `SECRET_KEY` | Crie `backend/.env` a partir do exemplo, gere sua chave e inicie a API dentro de `backend`. |
| Tabelas ausentes | Confira `SQLITE_PATH`, o diretório de execução e aplique `alembic upgrade head` no banco correto após backup. |
| Login com erro de rede/CORS | Confira se a API responde em `/docs`, a `VITE_API_URL` e a origem autorizada no backend. Reinicie após alterar `.env`. |
| Vite não inicia em 5173 | A porta está ocupada; reutilize ou encerre o servidor conhecido, ou configure outra porta e ajuste o CORS. |
| Recuperação retorna indisponibilidade | Configure o SMTP e o remetente conforme o guia operacional; `202` confirma o pedido, não a entrega do e-mail. |
| Migration bloqueada por duplicatas | Revise as aulas ou sessões ativas indicadas, sem apagar o banco nem alterar o checkpoint manualmente. |

## Documentação mantida

- [README.md](README.md): referência principal de produto, instalação e arquitetura.
- [docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md): estado atual, validações, limitações e prioridades.
- [docs/PASSWORD_RECOVERY.md](docs/PASSWORD_RECOVERY.md): configuração SMTP e comportamento operacional da recuperação.
- [frontend/src/assets/brand/README.md](frontend/src/assets/brand/README.md): origem, variantes e uso correto da marca.
- [AGENTS.md](AGENTS.md): fluxo de contribuição, preservação de dados e commits incrementais.

Guias antigos de instalação, auditoria, API e dicionários duplicados foram consolidados aqui. O contrato de API, os models e as migrations continuam como referências executáveis do comportamento; documentos históricos removidos permanecem recuperáveis pelo Git.
