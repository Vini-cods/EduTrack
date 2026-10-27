# EduTrack — histórico técnico e rastreabilidade

Backlog retrospectivo, especificações e rastreabilidade do código.

**Edição:** 24/10/2026 · **Corte:** `0776ce2d84830564d1fee29e5c760ee175657049` · **Histórico:** 57 commits de `main`, incluindo merges · **Inventário:** 307 arquivos versionados no corte.

**Organização de 27/10/2026:** o levantamento originalmente publicado em `openspec.md` pelo commit `9f8a9f0` foi preservado neste arquivo. O [OpenSpec da raiz](../openspec.md) passa a ser o guia operacional de produto, engenharia e especificação solicitado pelo usuário. Os dados históricos abaixo conservam seu corte original.

## Como ler e manter este documento

Este arquivo explica o que foi construído, por que mudou e onde está implementado. A cronologia descreve cada commit; o catálogo cobre todos os arquivos versionados no corte, incluindo código, testes, migrations, configuração, mídia e documentação. O backlog final separa pendências reais de recursos já entregues. O código integral permanece nos arquivos vinculados: a documentação descreve responsabilidades, contratos e símbolos, sem copiar a aplicação inteira.

A auditoria partiu de `git rev-list --reverse --topo-order`, metadados, arquivos alterados, diffs relevantes e código atual. A ordem é **topológica**, preservando os pais antes dos merges; datas de autoria podem não crescer estritamente entre ramificações. O diff de um merge é comparado ao primeiro pai, mas a autoria da funcionalidade continua nos commits de origem. Checkpoints automáticos auxiliares do ambiente não pertencem à linhagem de produto `main` e não são releases.

**Implementado** significa presente no snapshot descrito. **Validação histórica registrada** significa evidência escrita em um commit/documento anterior; não é execução nova. **Testes adicionados** significa cobertura declarada no código, sem provar resultado. **Substituído** indica comportamento histórico que deixou de ser a solução atual. **Pendente** exige trabalho ou homologação adicional. Não foram executados testes da aplicação, migrations, envio SMTP ou publicação para produzir esta documentação em 24/10.

Já existiu um `openspec.md` curto, introduzido em `a08176e` e removido em `66592bc` junto de guias redundantes. Ele relatava a ausência de uma estrutura de especificação naquela fase; não era este backlog. Esta edição reconstrói a evolução completa e complementa o [README](../README.md), o [estado de desenvolvimento](DEVELOPMENT_STATUS.md), o [guia operacional](PASSWORD_RECOVERY.md) e a [procedência da marca](../frontend/src/assets/brand/README.md).

O commit `9f8a9f0`, que publicou o levantamento, fica fora do corte retrospectivo acima. Ao atualizar este histórico, avance explicitamente o corte e acrescente os commits novos, sem reescrever decisões antigas como se fossem atuais. A reorganização de 27/10 altera o papel e a localização do documento, não as evidências de implementação registradas.

### Índice

1. [Visão de produto e arquitetura](#produto)
2. [Especificações funcionais atuais](#especificacoes)
3. [Decisões e limites](#decisoes)
4. [Índice dos 57 commits](#indice-commits)
5. [Backlog retrospectivo por commit](#historico)
6. [Catálogo do código e arquivos atuais](#catalogo)
7. [Contratos HTTP e rotas de interface](#contratos)
8. [Cadeia de migrations](#migrations)
9. [Validações históricas e auditoria desta edição](#validacoes)
10. [Backlog pendente e critérios de conclusão](#pendencias)

<a id="produto"></a>
## 1. Visão de produto e arquitetura

O EduTrack organiza a rotina de estudantes universitários e técnicos. O Dashboard deve responder **“o que preciso fazer hoje?”**, usando tarefas, aulas, provas, reservas de estudo e prazos reais. A evolução prioriza utilidade, clareza, arquitetura, consistência, performance, estética e efeitos, nessa ordem.

| Camada | Responsabilidade e implementação |
|---|---|
| Frontend | React 19/TypeScript, React Router, Vite, Tailwind, RHF/Zod, Axios, Recharts e Lucide. Páginas compõem; hooks coordenam; `lib` concentra regras; `api` concentra operações HTTP; componentes apresentam. |
| Backend | FastAPI/Pydantic recebem e validam contratos; services resolvem ownership e regras; SQLAlchemy representa persistência; Alembic evolui o schema. |
| Banco | SQLite é o ambiente homologado. MSSQL continua configurável e tem uma referência T-SQL histórica, com validação operacional própria ainda pendente. |
| Operação | API e worker de e-mail separados; outbox/rate limit duráveis, health checks, configuração de produção e CLI de backup. Preparação não equivale a infraestrutura publicada. |
| Evidências | pytest/HTTPX em bancos isolados e runner Node para regras do frontend. QA manual e ensaios de migration são registrados separadamente. |

| Entidade | Papel e fronteira |
|---|---|
| User | Proprietário de dados e credenciais; não há conta visitante atual. |
| Subject | Disciplina, professor, período/carga e contexto acadêmico. |
| Task | Intenção/entrega: prioridade, estimativa, prazo e status. Também representa o objetivo de estudo do Planner. |
| CalendarEvent | Compromisso/reserva de horário e ocorrência de série; não é uma cópia de Task. |
| StudySession / StudySegment | Execução e intervalos ativos fechados; pausas não contam como estudo. |
| TaskStatusEvent | Fatos prospectivos de conclusão/reabertura; não fabrica datas antigas. |
| Note / Material | Conhecimento em texto simples e referência de estudo por URL, respectivamente. |
| SubjectSyllabus / Assessment | Plano de ensino e avaliação com média parcial ponderada/normalizada e cobertura dos pesos. |
| UserPreferences | Tema, capacidade diária e configuração de Pomodoro por conta; timer executivo continua local. |
| RecoveryDelivery / RecoveryRateEvent / RecoveryRateLock | Intenção de entrega, tentativas/lease e decisão compartilhada de limites da recuperação. |

<a id="especificacoes"></a>
## 2. Especificações funcionais atuais

As regras abaixo descrevem o corte atual. A seção histórica registra quando cada capacidade apareceu e os estados intermediários.

| ID | Especificação e critérios observáveis | Código e origem principal |
|---|---|---|
| REQ-01 | Autenticar por e-mail/senha; confirmar `/auth/me`; exigir Bearer e proprietário nas operações acadêmicas. Inválido/ausente produz erro real; recursos alheios não vazam. | `auth_service`, `core/security`, `api/deps`, `AuthContext`, `PrivateRoute`; `18c7bdd`, `bc0ab44`, `ef66fd8`. |
| REQ-02 | Criar/editar/excluir disciplinas e mostrar progresso. Confirmar consequências da exclusão; preservar histórico desvinculado conforme o modelo. | `subject_service`, `Subjects`, `SubjectDetail`, `SubjectFormModal`, `SubjectDeleteModal`; `c10cfcb`. |
| REQ-03 | Manter tarefas com prioridade, estimativa, prazo/status e formulário compartilhado. Concluir/reabrir registra transição idempotente, sem inferir datas legadas. | `task_service`, `TaskFormModal`, `TaskStatusEvent`; `a08176e`, `1f8ef7c`, `527dab7`. |
| REQ-04 | Calendário mês/semana/dia mostra compromissos e prazos projetados de Task. Recorrência materializa ocorrências; excluir ocorrência e excluir série são ações distintas. | `calendar_event_service`, `calendarProjection`, componentes de calendário; `eaa8194`, `1f8ef7c`. |
| REQ-05 | Grade por dias/horários/período usa CalendarEvent de aula e disciplina existente. Rejeita aulas idênticas/intervalos inválidos; limite de 260 ocorrências/366 dias. | `classSchedule`, `ClassScheduleFormModal`, `DuplicateClassError`, índice de aulas; `c10cfcb`. |
| REQ-06 | Study Planner reutiliza Task como objetivo e CalendarEvent como reserva. Blocos não mudam estimativa/estado da tarefa; conflitos e agendamento após prazo são informados. | `useStudyPlanner`, `studyPlanner`, `StudyGoalRow`, `ScheduleStudyModal`; `1f8ef7c`. |
| REQ-07 | Focus usa deadline e reconcilia mutações com o servidor. Só uma sessão ativa/pausada por usuário; pausa/finalização fecham intervalo atomicamente. Finalizar estudo não conclui tarefa automaticamente. | `pomodoro`, `study_session_service`, índice ativo, `StudySegment`; `1f8ef7c`, `527dab7`. |
| REQ-08 | Notes possui texto/tags e vínculos opcionais coerentes; editar protege rascunhos. Busca inclui conteúdo, ignora acentos e oferece resumo/paginação com isolamento. | `note_service`, `useNotes`, `NoteEditor`, `search`; `879c43b`, `5396474`. |
| REQ-09 | Materials registra URL/contexto/categoria/status; status e exclusão só reconciliam a lista após resposta confirmada. Loading encerra em erro e aceita retry. | `material_service`, `Materials`, `Pagination`; `eaa8194`, `a740351`, `5396474`. |
| REQ-10 | Plano/avaliações por disciplina aceitam nota zero e vazio pendente. Média parcial é normalizada para 0–10 e ponderada; cobertura dos pesos explícita, sem declarar aprovação oficial. | `academic_record_service`, `academicRecords`, `useAcademicRecords`; `a740351`, `45e9d6a`. |
| REQ-11 | Dashboard prioriza compromisso atual/próximo em até 30 min e tarefas pela ordem definida; apresenta agenda, prazos, progresso, comparação e gráficos sem iniciar ações silenciosamente. | `dashboardRecommendation`, `useDashboard`, componentes de Dashboard; `a43928e`, `ebd678e`, `539cc68`. |
| REQ-12 | Analytics distingue planejado/realizado/estado de entregas/histórico. Usa fuso IANA e trechos comparáveis; base zero/futuro sem percentual inventado; oferece metodologia e alternativas tabulares. | `analytics_service`, `analytics_metrics`, `activity_history`, `Insights`; `0fec66b`, `e90f979`, `527dab7`. |
| REQ-13 | Academic Load soma agenda e esforço restante sem bloco sem duplicar a estimativa já coberta; compara com capacidade e explicita lacunas, excesso e pico. | `get_analytics`, `planning_diagnostics`, `AcademicLoad`; `b03058c`, `879c43b`, `0fec66b`. |
| REQ-14 | Ctrl/Cmd+K navega e busca contexto; Notes/Materials são pesquisados no servidor com cancelamento, até 5 resultados por tipo e falha parcial recuperável. | `CommandPalette`, `commandSearch`, `search_notes`, `page_materials`; `a740351`, `5396474`. |
| REQ-15 | Tema escolhido no login/cadastro continua no vídeo e no sistema. Perfil antigo não substitui a escolha; somente `{theme}` é sincronizado. Reload preserva intenção pendente e não repete vídeo; alterações posteriores substituem a anterior. | `authEntryReducer`, helpers de tema, `PreferencesSync`, providers; `ef66fd8`, `64e4948`. |
| REQ-16 | Introdução de cerca de 10 s ocupa viewport com `cover`, sem controles/textos de UI. Autoplay muted; fim, erro, rejeição ou timeout liberam entrada; Escape e movimento reduzido permanecem atendidos. | `AuthSuccessIntro`, MP4/posters; `03b478f`, `2ceb44c`, `44eaddc`. |
| REQ-17 | Portal editorial nos dois temas usa marca própria e rede Canvas com 18–36 partículas, DPR até 1,5 e desenho até 30 fps; pausa em aba oculta e respeita movimento reduzido. | `AuthLayout`, `AuthBrand`, `AuthBackdrop`, `AuthNetwork`; `e214a9e`, `7cbabaa`, `1044f08`, `d09b347`. |
| REQ-18 | Recuperação retorna pedido genérico, mas indisponibilidade real sem SMTP. Para conta ativa existente, a outbox persiste a intenção antes do 202; conta inexistente/inativa recebe resposta genérica sem criar entrega. Token expira e depende da versão da senha; worker faz lease/retry e limites são compartilhados no banco. | recuperação, outbox, worker e rate limit; `a740351`, `7773573`. |
| REQ-19 | Backup SQLite consistente usa API online, manifesto/hash e integridade; restaurar nunca sobrescreve destino existente. Operação contínua requer agendamento/retencão/cópia externa. | `sqlite_backup.py`, testes e guia operacional; `4db98ce`. |

### Requisitos transversais

- Preservar implementação funcional, separar UI de regras/IO e evitar dependências sem necessidade.
- Contexto e ownership devem ser verificados no servidor, inclusive vínculos entre tarefa, disciplina, sessão, nota e avaliação.
- Loading, erro, vazio e confirmação de ação são estados de produto. Compilar sozinho não comprova uma funcionalidade.
- Teclado/foco, alvos de interação, tema, responsividade e `prefers-reduced-motion` fazem parte dos critérios; a cobertura manual registrada não é auditoria completa.
- Banco local, backups e segredos não entram em commits novos; migrations e configuração de exemplo entram. Dados/credenciais históricos não são reproduzidos neste arquivo.

<a id="decisoes"></a>
## 3. Decisões e limites que precisam ser preservados

| Decisão | Motivo, consequência e trade-off |
|---|---|
| ADR-01 — intenção, agenda e execução separadas | Task define o objetivo, CalendarEvent reserva horário e StudySession registra execução. Evita duplicar prioridade/prazo/estimativa e evita conclusão automática da tarefa. O Planner atual não exige uma entidade paralela StudyPlan. |
| ADR-02 — recorrência materializada | Grava ocorrências com `recurrence_group_id`, mantendo consulta/edição simples. Não existe interpretador completo de RRULE; feriados e substituição da grade exigem ações explícitas. |
| ADR-03 — projeção de prazo | Prazo de Task aparece no calendário sem segunda linha persistida. Deduplicação por identidade/contexto não apaga registros apenas por título parecido. |
| ADR-04 — tempo explícito | CalendarEvent usa horário local sem offset; sessões, segmentos e histórico usam UTC. Analytics converte para fuso IANA e reparte intervalos conhecidos, sem contar pausas. |
| ADR-05 — histórico prospectivo | Não usar `updated_at` para inventar data de conclusão. Minutos legados sem segmentos continuam aproximados no início da sessão, com quantidade sinalizada. |
| ADR-06 — métricas determinísticas | Comparações usam períodos equivalentes e contexto de parcialidade. Padrões não medem eficiência, não preveem notas e não indicam horário ideal de aprendizagem. |
| ADR-07 — busca incremental | Paginação limita transferência; substring/tokens ainda varrem dados do dono. Full-text fica condicionado a medição de volume/latência. |
| ADR-08 — tema da entrada como intenção | Escolha ativa no envio do acesso já aparece no primeiro render; sincroniza só tema após ler o perfil. Mantém pendência até confirmação, com limites se storage estiver completamente bloqueado. Não há atualização em tempo real entre dispositivos. |
| ADR-09 — player simples e acessível | Mídia estática H.264/AAC, sem engine nova. `cover` preenche a tela mas recorta bordas, principalmente em portrait; autoplay sem som permite entrada automática. Falhas têm saída automática. |
| ADR-10 — outbox pelo menos uma vez | Claim por lease e retry toleram queda do worker, mas aceitação SMTP seguida de queda pode causar nova tentativa. 202 não prova envio e SMTP aceito não prova chegada à caixa postal. |
| ADR-11 — SQLite homologado | Migrations atuais e ensaios de preservação concentram-se em SQLite. Caminho MSSQL configurável/script histórico não equivalem a homologação das novas cascatas/constraints. |
| ADR-12 — média parcial, sem regra institucional inventada | Resultados normalizados/ponderados e cobertura ajudam o estudante, sem substituir média oficial, aprovação ou recuperação da instituição. |
| ADR-13 — identidade própria e motion limitado | Marca completa no portal/intro, símbolo interno; SVG da marca incorpora máscara raster, não é vetorização Bézier. Canvas 2D foi suficiente; não se adicionou WebGL para uma função decorativa. |
| ADR-14 — documentação com papéis distintos | README orienta execução; DEVELOPMENT_STATUS guarda estado/evidências/limites; PASSWORD_RECOVERY orienta operação; openspec registra rastreabilidade histórica e backlog, sem duplicar instalação inteira. |

<a id="indice-commits"></a>
## 4. Índice dos 57 commits

Datas abaixo são de autoria com offset do Git. Quando gravação e autoria diferem, o registro detalhado mostra ambas.

| Item | Data de autoria | Commit | Mensagem original |
|---|---|---|---|
| HIST-001 | 2026-08-30 | [`18c7bdd`](#commit-18c7bdd) | first commit |
| HIST-002 | 2026-08-30 | [`b895823`](#commit-b895823) | feat: add DashboardLayout and Sidebar components for improved navigation |
| HIST-003 | 2026-08-31 | [`1de1c28`](#commit-1de1c28) | Add project title to README |
| HIST-004 | 2026-09-01 | [`bc0ab44`](#commit-bc0ab44) | Atualiza o backend com CRUD de assuntos e tarefas, autenticação e ajustes de configuração |
| HIST-005 | 2026-09-01 | [`314fd43`](#commit-314fd43) | Adiciona banco SQLite local do projeto |
| HIST-006 | 2026-09-01 | [`a5b800b`](#commit-a5b800b) | Atualiza o frontend com autenticação, telas de dashboard e ajustes de UI |
| HIST-007 | 2026-09-01 | [`fa3d5d6`](#commit-fa3d5d6) | Atualiza a documentação do projeto com resumo e stack |
| HIST-008 | 2026-09-01 | [`f33399b`](#commit-f33399b) | Adiciona arquivo de instrucoes do projeto |
| HIST-009 | 2026-09-03 | [`11ed9a8`](#commit-11ed9a8) | Atualiza o guia de instalação e uso, corrigindo bugs de cadastro e design, e unificando nomenclaturas entre frontend e backend. |
| HIST-010 | 2026-09-20 | [`eaa8194`](#commit-eaa8194) | Atualiza projeto EduTrack |
| HIST-011 | 2026-10-06 | [`a08176e`](#commit-a08176e) | Add comprehensive documentation and validation for EduTrack project |
| HIST-012 | 2026-10-12 | [`1f8ef7c`](#commit-1f8ef7c) | Implementa recursos acadêmicos e aprimora a experiência |
| HIST-013 | 2026-10-12 | [`b03058c`](#commit-b03058c) | Aprimora autenticação e adiciona análises acadêmicas |
| HIST-014 | 2026-10-06 | [`dfc742b`](#commit-dfc742b) | added: data dictonary |
| HIST-015 | 2026-10-06 | [`02af587`](#commit-02af587) | Merge branch 'main' of https://github.com/Vini-cods/EduTrack |
| HIST-016 | 2026-10-13 | [`8e2e953`](#commit-8e2e953) | Mescla atualizações remotas e adiciona documentação do banco |
| HIST-017 | 2026-10-13 | [`879c43b`](#commit-879c43b) | Amplia painel, anotações e navegação acadêmica |
| HIST-018 | 2026-10-15 | [`cc96176`](#commit-cc96176) | chore(git): mantém banco SQLite local fora do versionamento |
| HIST-019 | 2026-10-15 | [`c10cfcb`](#commit-c10cfcb) | feat(subjects): adiciona gestão de disciplinas e cronograma semanal |
| HIST-020 | 2026-10-15 | [`a43928e`](#commit-a43928e) | feat(dashboard): apresenta gráficos semanais de estudo e carga |
| HIST-021 | 2026-10-15 | [`de95b44`](#commit-de95b44) | fix(ui): melhora contraste e cabeçalho em telas pequenas |
| HIST-022 | 2026-10-15 | [`81e6f86`](#commit-81e6f86) | docs: registra estado do produto e fluxo de commits incrementais |
| HIST-023 | 2026-10-15 | [`d91f096`](#commit-d91f096) | feat(auth): cria experiência de entrada acadêmica interativa |
| HIST-024 | 2026-10-15 | [`a740351`](#commit-a740351) | feat: adiciona registros acadêmicos e recuperação de senha |
| HIST-025 | 2026-10-16 | [`45e9d6a`](#commit-45e9d6a) | fix(academics): limita espera ao carregar plano e avaliações |
| HIST-026 | 2026-10-16 | [`9ac043a`](#commit-9ac043a) | docs: registra entrega acadêmica e configuração da recuperação |
| HIST-027 | 2026-10-17 | [`e214a9e`](#commit-e214a9e) | feat(auth): adota portal centralizado com acesso em etapas |
| HIST-028 | 2026-10-17 | [`c813e9f`](#commit-c813e9f) | docs(auth): registra novo portal e validações de acesso |
| HIST-029 | 2026-10-17 | [`7cbabaa`](#commit-7cbabaa) | feat(auth): aplica marca completa nas telas de entrada |
| HIST-030 | 2026-10-17 | [`6b6039a`](#commit-6b6039a) | feat(auth): anima conexões e pulsos do fundo |
| HIST-031 | 2026-10-17 | [`3caea48`](#commit-3caea48) | docs(auth): registra marca de entrada e motion das conexões |
| HIST-032 | 2026-10-17 | [`1044f08`](#commit-1044f08) | feat(auth): cria rede orgânica de partículas por proximidade |
| HIST-033 | 2026-10-17 | [`f2ed1c3`](#commit-f2ed1c3) | docs(auth): registra rede dinâmica e validação visual |
| HIST-034 | 2026-10-17 | [`9651b28`](#commit-9651b28) | fix(auth): reforça contraste das partículas e conexões |
| HIST-035 | 2026-10-17 | [`0fec66b`](#commit-0fec66b) | feat(analytics): adiciona comparações, padrões e diagnóstico de planejamento |
| HIST-036 | 2026-10-17 | [`32c5e97`](#commit-32c5e97) | perf(dashboard): agrega progresso e tarefas em uma consulta |
| HIST-037 | 2026-10-17 | [`49ccfb8`](#commit-49ccfb8) | test(perf): reduz custo do bcrypt apenas na suíte isolada |
| HIST-038 | 2026-10-17 | [`e90f979`](#commit-e90f979) | feat(insights): apresenta consistência, padrões e relatórios CSV |
| HIST-039 | 2026-10-17 | [`ebd678e`](#commit-ebd678e) | feat(dashboard): orienta próximo passo e distribui prazos da semana |
| HIST-040 | 2026-10-17 | [`d09b347`](#commit-d09b347) | style(auth): intensifica cores de partículas e conexões |
| HIST-041 | 2026-10-17 | [`66592bc`](#commit-66592bc) | docs: consolida guia definitivo e registra evolução de analytics |
| HIST-042 | 2026-10-18 | [`124b408`](#commit-124b408) | fix(navigation): mantém Insights acessível e alinha controles de período |
| HIST-043 | 2026-10-18 | [`539cc68`](#commit-539cc68) | fix(dashboard): equilibra cartões e reduz espaços vazios |
| HIST-044 | 2026-10-18 | [`1988377`](#commit-1988377) | docs: registra ajustes de navegação e layout com validações |
| HIST-045 | 2026-10-18 | [`5396474`](#commit-5396474) | feat(search): pagina Notes e Materials com busca no servidor |
| HIST-046 | 2026-10-18 | [`527dab7`](#commit-527dab7) | feat(analytics): registra conclusões e distribui intervalos ativos por dia |
| HIST-047 | 2026-10-18 | [`ef66fd8`](#commit-ef66fd8) | feat(preferences): sincroniza tema capacidade e Pomodoro por conta |
| HIST-048 | 2026-10-18 | [`7773573`](#commit-7773573) | feat(recovery): persiste entregas e prepara operação em produção |
| HIST-049 | 2026-10-18 | [`4db98ce`](#commit-4db98ce) | feat(backup): adiciona snapshots SQLite e restauração verificada |
| HIST-050 | 2026-10-18 | [`82ff78f`](#commit-82ff78f) | docs: consolida entrega validações e operação do EduTrack |
| HIST-051 | 2026-10-19 | [`03b478f`](#commit-03b478f) | feat(brand): add light and dark entry videos |
| HIST-052 | 2026-10-19 | [`2ceb44c`](#commit-2ceb44c) | feat(auth): play themed intro after login and registration |
| HIST-053 | 2026-10-19 | [`b529bf4`](#commit-b529bf4) | docs: record entry intro behavior and validation |
| HIST-054 | 2026-10-19 | [`44eaddc`](#commit-44eaddc) | refactor(auth): show themed entry video fullscreen without controls |
| HIST-055 | 2026-10-19 | [`a032702`](#commit-a032702) | docs: update fullscreen intro behavior and checks |
| HIST-056 | 2026-10-19 | [`64e4948`](#commit-64e4948) | fix(theme): preserve access theme through intro and dashboard |
| HIST-057 | 2026-10-19 | [`0776ce2`](#commit-0776ce2) | docs: clarify access theme precedence and regression checks |

<a id="historico"></a>
## 5. Backlog retrospectivo por commit

Cada item abaixo é uma unidade histórica concluída no Git, não uma afirmação de que todo recurso daquele snapshot já estava homologado. As listas recolhíveis contêm todos os arquivos alterados, inclusive remoções e documentação. `A` = adicionado, `M` = modificado, `D` = removido, `R` = renomeado; o percentual em R indica similaridade reportada pelo Git.

<a id="commit-18c7bdd"></a>
### HIST-001 — `18c7bdd` — first commit

**Autoria:** 2026-08-30T11:52:15-03:00 · **Diff:** [18c7bdd](https://github.com/Vini-cods/EduTrack/commit/18c7bddf1ef86e36bfe296e8589bd1563d96be37) · **Arquivos:** 65.

**Objetivo e entrega:** base executável do CRUD acadêmico e autenticação.

**Código e evolução:**

- backend dividido em `api/v1/endpoints`, `schemas`, `models`, `services`, `core` e `db`, com `User`, `Subject` e `Task`; rotas `auth/register`, `auth/login`, `auth/me`, `auth/forgot-password`, `auth/reset-password`, disciplinas, tarefas e dashboard. `auth_service` autentica/cria usuários; `subject_service` oferece CRUD e progresso; `task_service` filtra tarefa pela disciplina/proprietário; `dashboard_service.get_dashboard_metrics` conta tarefas por estado e progresso por disciplina. JWT/OAuth2 e hash de senha ficam em `core/security.py` e a sessão SQLAlchemy em `db/session.py`.
- Frontend: React/Vite, `AuthContext`, cliente Axios, `PrivateRoute`, rotas Login/Register/Dashboard/Subjects/SubjectDetail, interfaces TypeScript e formulários. Alembic possui configuração/env/template, ainda sem cadeia de revisões neste snapshot.

**Especificação resultante:** Autenticar via JWT; restringir CRUD acadêmico ao proprietário; calcular progresso por tarefas e disciplinas. Recuperação ainda não entrega e-mail.

**Validação e evidência:** diretório backend/tests possui apenas inicializador, sem suíte comportamental adicionada neste commit; não há evidência versionada de execução bem-sucedida.

**Limites e continuidade:** contratos ainda usam UUID em partes de schemas/services enquanto os models evoluem para IDs inteiros; parte dos nomes/status diverge do frontend. Recuperação gera token mas o envio de e-mail é TODO. Há restos do template Vite/entrada TypeScript simples que são removidos em b895823. Agregação do dashboard ainda faz consultas por disciplina, otimizada apenas mais tarde.

<details><summary>Todos os 65 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `.gitignore` |
| A | `backend/alembic.ini` |
| A | `backend/alembic/README` |
| A | `backend/alembic/env.py` |
| A | `backend/alembic/script.py.mako` |
| A | `backend/app/__init__.py` |
| A | `backend/app/api/__init__.py` |
| A | `backend/app/api/deps.py` |
| A | `backend/app/api/v1/__init__.py` |
| A | `backend/app/api/v1/endpoints/__init__.py` |
| A | `backend/app/api/v1/endpoints/auth.py` |
| A | `backend/app/api/v1/endpoints/dashboard.py` |
| A | `backend/app/api/v1/endpoints/subjects.py` |
| A | `backend/app/api/v1/endpoints/tasks.py` |
| A | `backend/app/api/v1/router.py` |
| A | `backend/app/core/__init__.py` |
| A | `backend/app/core/config.py` |
| A | `backend/app/core/security.py` |
| A | `backend/app/db/__init__.py` |
| A | `backend/app/db/base.py` |
| A | `backend/app/db/session.py` |
| A | `backend/app/main.py` |
| A | `backend/app/models/__init__.py` |
| A | `backend/app/models/subject.py` |
| A | `backend/app/models/task.py` |
| A | `backend/app/models/user.py` |
| A | `backend/app/schemas/__init__.py` |
| A | `backend/app/schemas/dashboard.py` |
| A | `backend/app/schemas/subject.py` |
| A | `backend/app/schemas/task.py` |
| A | `backend/app/schemas/token.py` |
| A | `backend/app/schemas/user.py` |
| A | `backend/app/services/__init__.py` |
| A | `backend/app/services/auth_service.py` |
| A | `backend/app/services/dashboard_service.py` |
| A | `backend/app/services/subject_service.py` |
| A | `backend/app/services/task_service.py` |
| A | `backend/requirements.txt` |
| A | `backend/tests/__init__.py` |
| A | `frontend/.gitignore` |
| A | `frontend/index.html` |
| A | `frontend/package-lock.json` |
| A | `frontend/package.json` |
| A | `frontend/public/favicon.svg` |
| A | `frontend/public/icons.svg` |
| A | `frontend/src/App.tsx` |
| A | `frontend/src/api/client.ts` |
| A | `frontend/src/assets/hero.png` |
| A | `frontend/src/assets/typescript.svg` |
| A | `frontend/src/assets/vite.svg` |
| A | `frontend/src/components/PrivateRoute.tsx` |
| A | `frontend/src/contexts/AuthContext.tsx` |
| A | `frontend/src/counter.ts` |
| A | `frontend/src/index.css` |
| A | `frontend/src/main.ts` |
| A | `frontend/src/main.tsx` |
| A | `frontend/src/pages/Dashboard.tsx` |
| A | `frontend/src/pages/Login.tsx` |
| A | `frontend/src/pages/Register.tsx` |
| A | `frontend/src/pages/SubjectDetail.tsx` |
| A | `frontend/src/pages/Subjects.tsx` |
| A | `frontend/src/style.css` |
| A | `frontend/src/types/index.ts` |
| A | `frontend/tsconfig.json` |
| A | `frontend/vite.config.ts` |

</details>

<a id="commit-b895823"></a>
### HIST-002 — `b895823` — feat: add DashboardLayout and Sidebar components for improved navigation

**Autoria:** 2026-08-30T17:04:44-03:00 · **Diff:** [b895823](https://github.com/Vini-cods/EduTrack/commit/b895823442aa434381e7459c1a6f2ea9d29480f7) · **Arquivos:** 19.

**Objetivo e entrega:** navegação interna consistente e primeiras telas de produtividade.

**Código e evolução:**

- `DashboardLayout` contém o `Outlet` e `Sidebar`; `App.tsx` aninha páginas protegidas nessa composição e acrescenta `/tasks`, `/insights`, `/forgot-password` e fallback de rota. `Tasks` centraliza tarefas/filtros; `Insights` desenha gráficos Recharts e dicas a partir de dados agregados. Redesenha Dashboard, login, cadastro e páginas de disciplinas. Remove `counter.ts`, `main.ts` e `style.css` do template antigo e desenvolve tokens/estilos em `index.css`.
- Autenticação: introduz `loginAsGuest`, que cria uma conta temporária por register+login, e usa `import type` em `AuthContext`.

**Especificação resultante:** Compartilhar layout de páginas protegidas, oferecer navegação global e primeiras visões Tasks/Insights; recuperação nessa versão ainda é simulada.

**Validação e evidência:** nenhum arquivo de teste novo; não inferir validação de execução pelo título.

**Limites e continuidade:** ForgotPassword é uma simulação com atraso local, ainda sem chamada HTTP; contratos usam `nome`/`titulo`/`progresso` e são alinhados em a5b800b. Insights ainda estima a divisão das pendências para gráficos, não é a análise temporal atual. Visitante é removido em a08176e.

<details><summary>Todos os 19 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/index.html` |
| M | `frontend/src/App.tsx` |
| A | `frontend/src/assets/logo.jpg` |
| A | `frontend/src/components/DashboardLayout.tsx` |
| A | `frontend/src/components/Sidebar.tsx` |
| M | `frontend/src/contexts/AuthContext.tsx` |
| D | `frontend/src/counter.ts` |
| M | `frontend/src/index.css` |
| D | `frontend/src/main.ts` |
| M | `frontend/src/pages/Dashboard.tsx` |
| A | `frontend/src/pages/ForgotPassword.tsx` |
| A | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/Register.tsx` |
| M | `frontend/src/pages/SubjectDetail.tsx` |
| M | `frontend/src/pages/Subjects.tsx` |
| A | `frontend/src/pages/Tasks.tsx` |
| D | `frontend/src/style.css` |
| M | `frontend/tsconfig.json` |

</details>

<a id="commit-1de1c28"></a>
### HIST-003 — `1de1c28` — Add project title to README

**Autoria:** 2026-08-31T20:12:54-03:00 · **Diff:** [1de1c28](https://github.com/Vini-cods/EduTrack/commit/1de1c28e15e67ca44487200a8a6b278a42f7da24) · **Arquivos:** 1.

**Objetivo e entrega:** cria `README.md` com uma única linha de título do projeto.

**Código e evolução:**

- Alteração documental ou de integração delimitada pelos arquivos abaixo; não cria por si só um fluxo executável novo.

**Especificação resultante:** Apresentar o nome do projeto no README, sem mudança de aplicação.

**Validação e evidência:** não altera código, dependência, testes ou comportamento. O guia é ampliado em fa3d5d6.

**Limites e continuidade:** Não inferir execução ou homologação a partir do título; considerar o escopo do snapshot histórico.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `README.md` |

</details>

<a id="commit-bc0ab44"></a>
### HIST-004 — `bc0ab44` — Atualiza o backend com CRUD de assuntos e tarefas, autenticação e ajustes de configuração

**Autoria:** 2026-09-01T19:46:32-03:00 · **Diff:** [bc0ab44](https://github.com/Vini-cods/EduTrack/commit/bc0ab44f803ab8c9cd6c0158151b19b8b321ba83) · **Arquivos:** 15.

**Objetivo e entrega:** permitir execução local simples e corrigir contratos inconsistentes do CRUD.

**Código e evolução:**

- `Settings.DATABASE_URL` passa a selecionar SQLite por padrão ou SQL Server; `db/session.py` aplica `check_same_thread=False` no SQLite e preserva configuração de pool para MSSQL. Acrescenta `.env.example` como modelo de configuração, sem necessidade de reproduzir seus valores no backlog.
- Contratos: converte IDs de schemas/rotas/services de UUID para `int`, troca TaskStatus para `pendente`, `em_andamento`, `concluida`, usa prazo `date` e ajusta agregados do dashboard. `auth_service.create_user` passa de `full_name` a `name`. `subject_service` ajusta criação/atualização/listagem com progresso e compatibilidade com os models.

**Especificação resultante:** Permitir SQLite local e MSSQL configurável; contratos devem usar IDs inteiros, name e status acadêmicos em português.

**Validação e evidência:** sem testes adicionados ou relatório específico de execução no diff.

**Limites e continuidade:** ainda é CRUD inicial; migrações reproduzíveis e validação acadêmica mais ampla chegam em 1f8ef7c e 879c43b. SQL Server permanece caminho configurável, não prova de homologação operacional.

<details><summary>Todos os 15 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `backend/.env.example` |
| M | `backend/app/api/v1/endpoints/subjects.py` |
| M | `backend/app/api/v1/endpoints/tasks.py` |
| M | `backend/app/core/config.py` |
| M | `backend/app/db/session.py` |
| M | `backend/app/models/subject.py` |
| M | `backend/app/schemas/dashboard.py` |
| M | `backend/app/schemas/subject.py` |
| M | `backend/app/schemas/task.py` |
| M | `backend/app/schemas/user.py` |
| M | `backend/app/services/auth_service.py` |
| M | `backend/app/services/dashboard_service.py` |
| M | `backend/app/services/subject_service.py` |
| M | `backend/app/services/task_service.py` |
| M | `backend/requirements.txt` |

</details>

<a id="commit-314fd43"></a>
### HIST-005 — `314fd43` — Adiciona banco SQLite local do projeto

**Autoria:** 2026-09-01T19:47:45-03:00 · **Diff:** [314fd43](https://github.com/Vini-cods/EduTrack/commit/314fd436a6e2d7524355915e7fadce2760a18043) · **Arquivos:** 1.

**Objetivo e entrega:** adiciona exclusivamente `backend/edutrack.db`, artefato binário. Nenhum código, schema de migration ou teste é adicionado.

**Código e evolução:**

- Alteração documental ou de integração delimitada pelos arquivos abaixo; não cria por si só um fluxo executável novo.

**Especificação resultante:** Registrar a adição histórica de artefato binário, sem tratá-lo como especificação/migration nem expor registros.

**Validação e evidência:** Sem registro versionado específico de execução identificado neste commit.

**Limites e continuidade:** o conteúdo dos registros não permite descrever evolução de código a partir do diff binário. Documentar como dívida histórica de versionamento, não como prática recomendada. O banco deixa de ser rastreado em cc96176, preservando o arquivo local.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `backend/edutrack.db` — binário histórico; dados não reproduzidos |

</details>

<a id="commit-a5b800b"></a>
### HIST-006 — `a5b800b` — Atualiza o frontend com autenticação, telas de dashboard e ajustes de UI

**Autoria:** 2026-09-01T20:06:16-03:00 · **Diff:** [a5b800b](https://github.com/Vini-cods/EduTrack/commit/a5b800b98aa79232f765698df021561260882ef0) · **Arquivos:** 15.

**Objetivo e entrega:** corrigir divergências de nomenclatura e endpoints que impediam os fluxos reais.

**Código e evolução:**

- interfaces e páginas passam de `nome`/`titulo`/`descricao`/`progresso` para `name`/`title`/`description`/`progress`; `DashboardData` adota `tasks_pending`, `tasks_in_progress`, `tasks_completed`, `overall_progress`, `subjects_progress`. `AuthContext` usa registro `name` e chamada `/auth/me`. Cadastro exibe detalhe de erro retornado pela API.
- Integração: Tasks busca `/tasks/subject/{id}`, altera status em `/tasks/{id}/status`, páginas de disciplinas usam as rotas reais; ForgotPassword passa a postar em `/auth/forgot-password`. Atualiza logo PNG, favicon/HTML e remove regras antigas de CSS.

**Especificação resultante:** Frontend deve enviar os campos e usar as rotas efetivamente aceitos pela API, inclusive name/title/status e rota específica de status.

**Validação e evidência:** sem testes adicionados neste commit.

**Limites e continuidade:** o frontend ainda assume sucesso do pedido de recuperação no catch/finally; envio SMTP do backend continua não implementado nessa fase. Há `any` em captura de erro que é removido em evoluções posteriores.

<details><summary>Todos os 15 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/index.html` |
| M | `frontend/src/api/client.ts` |
| A | `frontend/src/assets/logo.png` |
| M | `frontend/src/components/Sidebar.tsx` |
| M | `frontend/src/contexts/AuthContext.tsx` |
| M | `frontend/src/index.css` |
| M | `frontend/src/pages/Dashboard.tsx` |
| M | `frontend/src/pages/ForgotPassword.tsx` |
| M | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/Register.tsx` |
| M | `frontend/src/pages/SubjectDetail.tsx` |
| M | `frontend/src/pages/Subjects.tsx` |
| M | `frontend/src/pages/Tasks.tsx` |
| M | `frontend/src/types/index.ts` |

</details>

<a id="commit-fa3d5d6"></a>
### HIST-007 — `fa3d5d6` — Atualiza a documentação do projeto com resumo e stack

**Autoria:** 2026-09-01T20:09:01-03:00 · **Diff:** [fa3d5d6](https://github.com/Vini-cods/EduTrack/commit/fa3d5d6e2acce39817c65ba8d351ed171acf04b6) · **Arquivos:** 1.

**Objetivo e entrega:** amplia apenas `README.md`, de título mínimo para apresentação, funcionalidades, stack e organização do projeto.

**Código e evolução:**

- Alteração documental ou de integração delimitada pelos arquivos abaixo; não cria por si só um fluxo executável novo.

**Especificação resultante:** Documentar resumo, recursos e stack disponíveis naquela revisão.

**Validação e evidência:** não muda implementação ou testes. Tratar as afirmações como documentação daquele estágio, não comprovação autônoma de recursos ou execução. O README consolidado posterior substitui instruções obsoletas.

**Limites e continuidade:** Não inferir execução ou homologação a partir do título; considerar o escopo do snapshot histórico.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `README.md` |

</details>

<a id="commit-f33399b"></a>
### HIST-008 — `f33399b` — Adiciona arquivo de instrucoes do projeto

**Autoria:** 2026-09-01T20:09:19-03:00 · **Diff:** [f33399b](https://github.com/Vini-cods/EduTrack/commit/f33399bf3455a8a389c6f299429f426c44d6b1c6) · **Arquivos:** 1.

**Objetivo e entrega:** adiciona apenas `LEIA-ME.md`, com instruções de instalação/execução e uso do projeto.

**Código e evolução:**

- Alteração documental ou de integração delimitada pelos arquivos abaixo; não cria por si só um fluxo executável novo.

**Especificação resultante:** Fornecer instruções iniciais para instalar, executar e usar o projeto.

**Validação e evidência:** sem modificação de aplicação ou suíte. Documento é revisado em 11ed9a8 e removido na consolidação posterior.

**Limites e continuidade:** Não inferir execução ou homologação a partir do título; considerar o escopo do snapshot histórico.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `LEIA-ME.md` |

</details>

<a id="commit-11ed9a8"></a>
### HIST-009 — `11ed9a8` — Atualiza o guia de instalação e uso, corrigindo bugs de cadastro e design, e unificando nomenclaturas entre frontend e backend.

**Autoria:** 2026-09-03T22:55:34-03:00 · **Diff:** [11ed9a8](https://github.com/Vini-cods/EduTrack/commit/11ed9a8e325bf72a242bc1bc05ea4b7b767dafb4) · **Arquivos:** 1.

**Objetivo e entrega:** altera somente `LEIA-ME.md` (166 inserções/113 remoções); revisa execução, nomenclaturas, explicações de cadastro e design.

**Código e evolução:**

- Alteração documental ou de integração delimitada pelos arquivos abaixo; não cria por si só um fluxo executável novo.

**Especificação resultante:** Atualizar instruções e nomenclaturas; não atribuir correção de código a um commit só documental.

**Validação e evidência:** instruções/guias não equivalem a teste executado; nenhum teste novo.

**Limites e continuidade:** Cuidado de interpretação: embora a mensagem diga “corrigindo bugs de cadastro e design”, este commit não modifica código dessas telas. As correções de contrato já aparecem nos commits de 01/09; não atribuir nova implementação a um diff exclusivamente documental.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `LEIA-ME.md` |

</details>

<a id="commit-eaa8194"></a>
### HIST-010 — `eaa8194` — Atualiza projeto EduTrack

**Autoria:** 2026-09-20T11:18:45-03:00 · **Diff:** [eaa8194](https://github.com/Vini-cods/EduTrack/commit/eaa8194d2188fe84f108e91623cd07d41dd6cd30) · **Arquivos:** 82.

**Objetivo e entrega:** expandir o CRUD inicial para planejamento e produtividade acadêmica.

**Código e evolução:**

- Backend: adiciona `CalendarEvent`, `StudySession`, `Material`, seus schemas, services e grupos de rotas. `calendar_event_service.expand_recurrence` materializa ocorrências diárias/semanais, com `recurrence_group_id`, limite de 260, edição de ocorrência e exclusão de série. `study_session_service` implementa start/pause/resume/stop, um segmento ativo e segundos acumulados; sessão representa execução e não intenção. `material_service` oferece CRUD/status por disciplina e proprietário. Task recebe prioridade e estimativa; `get_tasks_for_user`/GET `/tasks/` entregam todas as tarefas com disciplina em uma consulta e ordenação por prazo, evitando chamada por disciplina. Remove duplicação da dependency `get_db` em db/session, mantendo a de api/deps.
- Frontend: adiciona Calendar/MonthView/WeekView/DayView/TimeGrid/EventModal, StudyPlanner, FocusMode, Materials, CommandPalette, Topbar, Logo, BreadcrumbContext, hooks de media/count-up e bibliotecas de datas/calendário/insights/Pomodoro/tarefas. Cria Design System com Button, Card, Badge, Drawer, Modal, Tabs, Tooltip, TextField, Skeleton, EmptyState e outros componentes; identidade editorial off-white/navy/crimson. Introduz placeholders ComingSoon para áreas ainda não concluídas.

**Especificação resultante:** Separar Task/intenção, CalendarEvent/reserva e StudySession/execução; materializar recorrência; oferecer CRUD contextual de materiais e testes de ownership.

**Validação e evidência:** adiciona pytest.ini, conftest com banco isolado e testes de auth, subjects, tasks, dashboard, calendar_events, study_sessions e materials, incluindo ownership e transições. Não há relatório de execução nesse diff; a evidência de 78 passed é documentada depois em a08176e.

**Limites e continuidade:** Limites corrigidos depois: consulta de calendário inicialmente considera início, sem toda sobreposição; a checagem de sessão ativa ainda depende da aplicação, sem índice no banco; componentes grandes/refatoração de Planner/Focus ficam para 1f8ef7c. Banco binário ainda rastreado.

<details><summary>Todos os 82 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/alembic/env.py` |
| A | `backend/app/api/v1/endpoints/calendar_events.py` |
| A | `backend/app/api/v1/endpoints/materials.py` |
| A | `backend/app/api/v1/endpoints/study_sessions.py` |
| M | `backend/app/api/v1/endpoints/tasks.py` |
| M | `backend/app/api/v1/router.py` |
| M | `backend/app/db/session.py` |
| M | `backend/app/models/__init__.py` |
| A | `backend/app/models/calendar_event.py` |
| A | `backend/app/models/material.py` |
| A | `backend/app/models/study_session.py` |
| M | `backend/app/models/subject.py` |
| M | `backend/app/models/task.py` |
| M | `backend/app/models/user.py` |
| A | `backend/app/schemas/calendar_event.py` |
| A | `backend/app/schemas/material.py` |
| A | `backend/app/schemas/study_session.py` |
| M | `backend/app/schemas/task.py` |
| A | `backend/app/services/calendar_event_service.py` |
| A | `backend/app/services/material_service.py` |
| A | `backend/app/services/study_session_service.py` |
| M | `backend/app/services/task_service.py` |
| M | `backend/edutrack.db` — binário histórico; dados não reproduzidos |
| A | `backend/pytest.ini` |
| A | `backend/tests/conftest.py` |
| A | `backend/tests/test_auth.py` |
| A | `backend/tests/test_calendar_events.py` |
| A | `backend/tests/test_dashboard.py` |
| A | `backend/tests/test_materials.py` |
| A | `backend/tests/test_study_sessions.py` |
| A | `backend/tests/test_subjects.py` |
| A | `backend/tests/test_tasks.py` |
| M | `frontend/index.html` |
| M | `frontend/public/favicon.svg` |
| M | `frontend/src/App.tsx` |
| A | `frontend/src/components/CommandPalette.tsx` |
| M | `frontend/src/components/DashboardLayout.tsx` |
| A | `frontend/src/components/Logo.tsx` |
| M | `frontend/src/components/Sidebar.tsx` |
| A | `frontend/src/components/Topbar.tsx` |
| A | `frontend/src/components/calendar/DayView.tsx` |
| A | `frontend/src/components/calendar/EventModal.tsx` |
| A | `frontend/src/components/calendar/MonthView.tsx` |
| A | `frontend/src/components/calendar/TimeGrid.tsx` |
| A | `frontend/src/components/calendar/WeekView.tsx` |
| A | `frontend/src/components/ui/Badge.tsx` |
| A | `frontend/src/components/ui/Button.tsx` |
| A | `frontend/src/components/ui/Card.tsx` |
| A | `frontend/src/components/ui/Drawer.tsx` |
| A | `frontend/src/components/ui/EmptyState.tsx` |
| A | `frontend/src/components/ui/Modal.tsx` |
| A | `frontend/src/components/ui/ProgressBar.tsx` |
| A | `frontend/src/components/ui/SectionHeader.tsx` |
| A | `frontend/src/components/ui/Skeleton.tsx` |
| A | `frontend/src/components/ui/Tabs.tsx` |
| A | `frontend/src/components/ui/TextField.tsx` |
| A | `frontend/src/components/ui/Tooltip.tsx` |
| A | `frontend/src/components/ui/index.ts` |
| A | `frontend/src/contexts/BreadcrumbContext.tsx` |
| A | `frontend/src/hooks/useCountUp.ts` |
| A | `frontend/src/hooks/useMediaQuery.ts` |
| M | `frontend/src/index.css` |
| A | `frontend/src/lib/calendar.ts` |
| A | `frontend/src/lib/date.ts` |
| A | `frontend/src/lib/insights.ts` |
| A | `frontend/src/lib/materials.ts` |
| A | `frontend/src/lib/pomodoro.ts` |
| A | `frontend/src/lib/tasks.ts` |
| A | `frontend/src/pages/Calendar.tsx` |
| A | `frontend/src/pages/ComingSoon.tsx` |
| M | `frontend/src/pages/Dashboard.tsx` |
| A | `frontend/src/pages/FocusMode.tsx` |
| M | `frontend/src/pages/ForgotPassword.tsx` |
| M | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/pages/Login.tsx` |
| A | `frontend/src/pages/Materials.tsx` |
| M | `frontend/src/pages/Register.tsx` |
| A | `frontend/src/pages/StudyPlanner.tsx` |
| M | `frontend/src/pages/SubjectDetail.tsx` |
| M | `frontend/src/pages/Subjects.tsx` |
| M | `frontend/src/pages/Tasks.tsx` |
| M | `frontend/src/types/index.ts` |

</details>

<a id="commit-a08176e"></a>
### HIST-011 — `a08176e` — Add comprehensive documentation and validation for EduTrack project

**Autoria:** 2026-10-06T15:49:47-03:00 · **Diff:** [a08176e](https://github.com/Vini-cods/EduTrack/commit/a08176efe8cc2da71055d01e8f055aa879f05bb2) · **Arquivos:** 15.

**Objetivo e entrega:** documentar o contrato existente e fechar lacunas de edição/UI.

**Código e evolução:**

- `TaskEditModal.tsx` implementa formulário de edição; Tasks e SubjectDetail recebem ações de editar, feedback e recarga. `date.ts` cria `getDueDateStatus` e `DUE_DATE_TEXT_CLASS` para atrasada/hoje/próximo/sem_prazo sem confundir conclusão. `AuthContext` define `LoginCredentials` e `RegisterData`, substitui `any` nesses contratos e remove `loginAsGuest`; a página Login perde a ação de visitante. Ajusta Sidebar/Topbar e campos de login.
- Documentos: cria `GUIA_DE_EXECUCAO_E_TESTES.md`, `api-documentation.md`, `crud-validation.md`, `data-dictionary.md` e um `openspec.md` de 44 linhas, cujo conteúdo era relatório de ausência da estrutura OpenSpec, não backlog de commits.

**Especificação resultante:** Editar tarefa com formulário e classificar prazo sem confundir conclusão; tipar autenticação e remover visitante; documentar contratos/testes existentes.

**Validação e evidência:** Validação histórica declarada: `crud-validation.md` registra “78 passed” na suíte pytest com SQLite em memória e matriz de CRUD/ownership/cascatas/tempo real de pausa; o guia descreve type-check/build e QA manual. Esta auditoria não reexecutou esses comandos. O diff remove especificamente o teste do fluxo visitante; não dizer que adicionou esse teste.

**Limites e continuidade:** o `openspec.md` antigo contém afirmações históricas daquele momento, não especificações atuais; posteriormente removido na consolidação. A nova documentação solicitada deve substituir esse propósito sem repetir a afirmação de que o arquivo “nunca existiu”.

<details><summary>Todos os 15 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `GUIA_DE_EXECUCAO_E_TESTES.md` |
| A | `api-documentation.md` |
| M | `backend/edutrack.db` — binário histórico; dados não reproduzidos |
| M | `backend/tests/test_auth.py` |
| A | `crud-validation.md` |
| A | `data-dictionary.md` |
| M | `frontend/src/components/Sidebar.tsx` |
| M | `frontend/src/components/Topbar.tsx` |
| A | `frontend/src/components/tasks/TaskEditModal.tsx` |
| M | `frontend/src/contexts/AuthContext.tsx` |
| M | `frontend/src/lib/date.ts` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/SubjectDetail.tsx` |
| M | `frontend/src/pages/Tasks.tsx` |
| A | `openspec.md` |

</details>

<a id="commit-1f8ef7c"></a>
### HIST-012 — `1f8ef7c` — Implementa recursos acadêmicos e aprimora a experiência

**Autoria:** 2026-10-12T23:25:10-03:00 · **Diff:** [1f8ef7c](https://github.com/Vini-cods/EduTrack/commit/1f8ef7c6b5f9430caa7f384fb54f1e7566f95eb9) · **Arquivos:** 83.

**Objetivo e entrega:** separar intenção, agenda e execução, reduzir duplicação e fortalecer integridade.

**Código e evolução:**

- Planner: `TaskFormModal`/taskForm reutilizam Task (prioridade, prazo, disciplina, estimativa); `useStudyPlanner`, API studyPlanner, `StudyGoalRow` e `ScheduleStudyModal` isolam carregamento, filtros, objetivos e blocos. `studyPlanner.ts` define isStudyGoal, upcomingStudyBlocks, filterStudyGoals, studyWeekSummary, buildStudyBlock, conflictingEvents e studyBlockPastDeadline. Objetivo exige estimativa positiva; vários blocos podem cobrir uma tarefa sem criar outra entidade StudyPlan.
- Focus: `pomodoro.ts` usa deadline, persistência/normalização e create/pause/resume/restore do timer; `confirmSessionMutation` reconcilia respostas da API. Banco recebe índice único para uma sessão ativa/pausada por usuário e tratamento de conflito. `academic_context.resolve_subject_id` centraliza ownership e consistência entre tarefa e disciplina. Mover tarefa atualiza agenda, mas preserva o contexto histórico das sessões.
- Calendário/tarefas: valida títulos/IDs/intervalos/fusos em PATCH e criação, rejeita recorrência sem ocorrências; consulta inclui sobreposições. `calendarProjection.ts` projeta prazo de Task sem duplicar linhas no banco e preserva eventos legítimos; compartilhamento do formulário reduz TaskEditModal duplicado. Modal recebe foco/Tab/Escape/restauração e rolagem.
- API: acrescenta model/schema/service/rotas Note; `analytics_service.get_analytics` calcula estudo realizado/planejado, carga diária/por disciplina, estimativa restante sem dupla contagem, consistência e observações determinísticas, com janela de até 93 dias e fuso IANA. `ThemeContext`, ThemeToggle, `theme-init.js`, lib/theme e CSS introduzem claro/escuro/sistema; capacity/hook e componentes/tipos básicos de analytics são adicionados.
- Migrations: baseline `1b7cae50f901`, calendário `96fdd9a96d98`, campos de Task `64de913a920e`, sessões `920618c3f9a9`, materiais `ebf926553436`, unicidade ativa `c218e785d190`, Notes `d7a42be19c30`.

**Especificação resultante:** Reutilizar Task como objetivo; blocos independem da estimativa; timer usa deadline; só uma sessão ativa/pausada por usuário; validar contexto acadêmico; não fabricar histórico temporal ausente.

**Validação e evidência:** adiciona frontend/tests calendarProjection/pomodoro/studyPlanner e expande pytest de calendário/sessões/tarefas/migration. `docs/DEVELOPMENT_STATUS.md` registra comandos de validação e decisões, mas não total de resultados aprovados nesse snapshot.

**Limites e continuidade:** Limites daquele ponto: backend Notes/analytics existe, mas Notes e Settings continuam placeholders de UI; Insights antigo é removido para substituição e AcademicLoad ainda precisa etapa própria. Tempo realizado é atribuído ao dia de início, sem StudySegments por dia; Task ainda não tem histórico de conclusão. Essas limitações evoluem em 879c43b e 527dab7. Em 1f8ef7c, App.tsx ainda importa ./pages/Insights, mas o arquivo foi removido; referência pendente constatada estaticamente, sem executar build. b03058c restaura o módulo.

<details><summary>Todos os 83 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `.gitignore` |
| M | `GUIA_DE_EXECUCAO_E_TESTES.md` |
| M | `backend/alembic/env.py` |
| A | `backend/alembic/versions/1b7cae50f901_create_academic_baseline.py` |
| A | `backend/alembic/versions/64de913a920e_add_task_priority_estimated_hours_and_.py` |
| A | `backend/alembic/versions/920618c3f9a9_add_study_sessions_table.py` |
| A | `backend/alembic/versions/96fdd9a96d98_add_calendar_events_table.py` |
| A | `backend/alembic/versions/c218e785d190_enforce_one_active_study_session.py` |
| A | `backend/alembic/versions/d7a42be19c30_add_notes.py` |
| A | `backend/alembic/versions/ebf926553436_add_materials_table.py` |
| A | `backend/app/api/v1/endpoints/analytics.py` |
| M | `backend/app/api/v1/endpoints/calendar_events.py` |
| A | `backend/app/api/v1/endpoints/notes.py` |
| M | `backend/app/api/v1/endpoints/study_sessions.py` |
| M | `backend/app/api/v1/router.py` |
| M | `backend/app/models/__init__.py` |
| A | `backend/app/models/note.py` |
| M | `backend/app/models/study_session.py` |
| M | `backend/app/models/subject.py` |
| M | `backend/app/models/task.py` |
| M | `backend/app/models/user.py` |
| A | `backend/app/schemas/analytics.py` |
| M | `backend/app/schemas/calendar_event.py` |
| A | `backend/app/schemas/note.py` |
| M | `backend/app/schemas/study_session.py` |
| M | `backend/app/schemas/task.py` |
| A | `backend/app/services/academic_context.py` |
| A | `backend/app/services/analytics_service.py` |
| M | `backend/app/services/calendar_event_service.py` |
| A | `backend/app/services/note_service.py` |
| M | `backend/app/services/study_session_service.py` |
| M | `backend/app/services/task_service.py` |
| M | `backend/edutrack.db` — binário histórico; dados não reproduzidos |
| M | `backend/requirements.txt` |
| M | `backend/tests/test_calendar_events.py` |
| A | `backend/tests/test_study_session_migration.py` |
| M | `backend/tests/test_study_sessions.py` |
| M | `backend/tests/test_tasks.py` |
| A | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/index.html` |
| M | `frontend/package.json` |
| A | `frontend/public/theme-init.js` |
| A | `frontend/src/api/analytics.ts` |
| A | `frontend/src/api/studyPlanner.ts` |
| A | `frontend/src/assets/edutrack-logo.jpeg` |
| A | `frontend/src/components/ThemeToggle.tsx` |
| A | `frontend/src/components/analytics/AnalyticsControls.tsx` |
| A | `frontend/src/components/analytics/AnalyticsMethodology.tsx` |
| A | `frontend/src/components/analytics/AnalyticsState.tsx` |
| A | `frontend/src/components/analytics/StudyTrendChart.tsx` |
| M | `frontend/src/components/calendar/EventModal.tsx` |
| M | `frontend/src/components/calendar/MonthView.tsx` |
| M | `frontend/src/components/calendar/TimeGrid.tsx` |
| A | `frontend/src/components/study/ScheduleStudyModal.tsx` |
| A | `frontend/src/components/study/StudyGoalRow.tsx` |
| M | `frontend/src/components/tasks/TaskEditModal.tsx` |
| A | `frontend/src/components/tasks/TaskFormModal.tsx` |
| M | `frontend/src/components/ui/Modal.tsx` |
| A | `frontend/src/contexts/ThemeContext.tsx` |
| A | `frontend/src/hooks/useAcademicCapacity.ts` |
| A | `frontend/src/hooks/useAnalytics.ts` |
| A | `frontend/src/hooks/useAnalyticsPeriod.ts` |
| A | `frontend/src/hooks/useStudyPlanner.ts` |
| M | `frontend/src/index.css` |
| A | `frontend/src/lib/analytics.ts` |
| M | `frontend/src/lib/calendar.ts` |
| A | `frontend/src/lib/calendarProjection.ts` |
| M | `frontend/src/lib/pomodoro.ts` |
| A | `frontend/src/lib/studyPlanner.ts` |
| A | `frontend/src/lib/taskForm.ts` |
| A | `frontend/src/lib/theme.ts` |
| M | `frontend/src/main.tsx` |
| M | `frontend/src/pages/Calendar.tsx` |
| M | `frontend/src/pages/Dashboard.tsx` |
| M | `frontend/src/pages/FocusMode.tsx` |
| D | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/pages/StudyPlanner.tsx` |
| M | `frontend/src/pages/Tasks.tsx` |
| A | `frontend/src/types/analytics.ts` |
| M | `frontend/src/types/index.ts` |
| A | `frontend/tests/calendarProjection.test.mjs` |
| A | `frontend/tests/pomodoro.test.mjs` |
| A | `frontend/tests/studyPlanner.test.mjs` |

</details>

<a id="commit-b03058c"></a>
### HIST-013 — `b03058c` — Aprimora autenticação e adiciona análises acadêmicas

**Autoria:** 2026-10-12T23:31:02-03:00 · **Diff:** [b03058c](https://github.com/Vini-cods/EduTrack/commit/b03058c2f8dbaa83586ed00657695915ca294c35) · **Arquivos:** 9.

**Objetivo e entrega:** concluir consumo visual de analytics e reduzir duplicação nas telas públicas.

**Código e evolução:**

- introduz `AuthLayout` compartilhado e refatora Login/Register para formulários menores com validação, confirmação de senha, controle de envios e TextField acessível (forwardRef, useId, aria-invalid/aria-describedby e erro associado). Logo e marca são ajustados.
- `Insights.tsx` usa `useAnalytics`/período/capacidade para exibir estudo realizado/agendado, consistência, entregas, gráfico e tabela por disciplina, observações e metodologia. `AcademicLoad.tsx` e `AcademicLoadChart` comparam agenda + estimativa não coberta versus capacidade diária configurável, listam dias excedidos e distribuem por disciplina, sem somar novamente blocos da tarefa.

**Especificação resultante:** Compartilhar layout de acesso e apresentar analytics reais de estudo/carga, com tabelas, metodologia, erro/loading e capacidade local configurável.

**Validação e evidência:** sem arquivos de teste novos ou log de execução específico no diff. As regras e testes básicos de analytics do frontend foram iniciados em 1f8ef7c e ampliados depois.

**Limites e continuidade:** a capacidade é local por navegador/usuário nessa fase; sync por conta vem em ef66fd8. A rota efetiva de AcademicLoad aparece na reorganização de App em 879c43b. Não chamar esta versão de analytics avançado de comparação/padrões/CSV, que chega em 0fec66b/e90f979.

<details><summary>Todos os 9 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/edutrack.db` — binário histórico; dados não reproduzidos |
| A | `frontend/src/components/AuthLayout.tsx` |
| M | `frontend/src/components/Logo.tsx` |
| A | `frontend/src/components/analytics/AcademicLoadChart.tsx` |
| M | `frontend/src/components/ui/TextField.tsx` |
| A | `frontend/src/pages/AcademicLoad.tsx` |
| A | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/Register.tsx` |

</details>

<a id="commit-dfc742b"></a>
### HIST-014 — `dfc742b` — added: data dictonary

**Autoria:** 2026-10-06T19:45:18-03:00 · **Diff:** [dfc742b](https://github.com/Vini-cods/EduTrack/commit/dfc742bf66b2542f279f7ab35fa2c4d220b1589e) · **Arquivos:** 3.

**Objetivo e entrega:** adiciona `backend/edutrack_ssms.sql` e `dicionario_de_dados.md`, além de alterar um snapshot SQLite binário em uma linha paralela do histórico.

**Código e evolução:**

- Conteúdo técnico: script T-SQL cria database e core `users`, `subjects`, `tasks`, PK/FK, índice de e-mail e índices de proprietário/disciplina, com constraint dos status de tarefa. Não representa automaticamente as entidades acadêmicas posteriores CalendarEvent/StudySession/Notes etc.

**Especificação resultante:** Disponibilizar uma descrição T-SQL do core users/subjects/tasks sem afirmar homologação de SQL Server ou cobertura do schema futuro.

**Validação e evidência:** Validação/limite: presença do script e dicionário não comprova execução no SQL Server; não interpretar o binário como migration nem inspecionar registros de usuários. Material documental fica obsoleto conforme o esquema Alembic evolui.

**Limites e continuidade:** Não inferir execução ou homologação a partir do título; considerar o escopo do snapshot histórico.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/edutrack.db` — binário histórico; dados não reproduzidos |
| A | `backend/edutrack_ssms.sql` |
| A | `dicionario_de_dados.md` |

</details>

<a id="commit-02af587"></a>
### HIST-015 — `02af587` — Merge branch 'main' of https://github.com/Vini-cods/EduTrack

**Autoria:** 2026-10-06T19:48:27-03:00 · **Diff:** [02af587](https://github.com/Vini-cods/EduTrack/commit/02af587d0eff2e0a9354384304feef6e0f4b89e1) · **Arquivos:** 88.
**Merge; pais:** `dfc742b`, `a08176e`. Integração contra o primeiro pai; sem duplicar a entrega dos commits de origem.

**Objetivo e entrega:** merge da evolução remota — 06/10/2026

**Código e evolução:**

- Pais: `dfc742b` (primeiro) e `a08176e` (segundo). Integra a linha documental/SQL paralela com a linha de calendário/estudos/materiais/auditoria já descrita.

**Especificação resultante:** Integrar as duas linhas por merge, mantendo atribuição da implementação aos commits originais e sem contar novamente funcionalidades/testes.

**Validação e evidência:** Sem registro versionado específico de execução identificado neste commit.

**Limites e continuidade:** Cuidado de contagem: o diff contra o primeiro pai exibe novamente dezenas de arquivos de eaa8194/a08176e; não é uma segunda criação independente dessas funcionalidades nem novas 78 validações. Não há testes adicionais próprios do merge demonstrados pelo snapshot combinado. Limite: merge deve ser registrado individualmente por rastreabilidade, com os dois pais e resolução de integração; a implementação de origem continua atribuída aos commits originais.

<details><summary>Todos os 88 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `GUIA_DE_EXECUCAO_E_TESTES.md` |
| A | `api-documentation.md` |
| M | `backend/alembic/env.py` |
| A | `backend/app/api/v1/endpoints/calendar_events.py` |
| A | `backend/app/api/v1/endpoints/materials.py` |
| A | `backend/app/api/v1/endpoints/study_sessions.py` |
| M | `backend/app/api/v1/endpoints/tasks.py` |
| M | `backend/app/api/v1/router.py` |
| M | `backend/app/db/session.py` |
| M | `backend/app/models/__init__.py` |
| A | `backend/app/models/calendar_event.py` |
| A | `backend/app/models/material.py` |
| A | `backend/app/models/study_session.py` |
| M | `backend/app/models/subject.py` |
| M | `backend/app/models/task.py` |
| M | `backend/app/models/user.py` |
| A | `backend/app/schemas/calendar_event.py` |
| A | `backend/app/schemas/material.py` |
| A | `backend/app/schemas/study_session.py` |
| M | `backend/app/schemas/task.py` |
| A | `backend/app/services/calendar_event_service.py` |
| A | `backend/app/services/material_service.py` |
| A | `backend/app/services/study_session_service.py` |
| M | `backend/app/services/task_service.py` |
| A | `backend/pytest.ini` |
| A | `backend/tests/conftest.py` |
| A | `backend/tests/test_auth.py` |
| A | `backend/tests/test_calendar_events.py` |
| A | `backend/tests/test_dashboard.py` |
| A | `backend/tests/test_materials.py` |
| A | `backend/tests/test_study_sessions.py` |
| A | `backend/tests/test_subjects.py` |
| A | `backend/tests/test_tasks.py` |
| A | `crud-validation.md` |
| A | `data-dictionary.md` |
| M | `frontend/index.html` |
| M | `frontend/public/favicon.svg` |
| M | `frontend/src/App.tsx` |
| A | `frontend/src/components/CommandPalette.tsx` |
| M | `frontend/src/components/DashboardLayout.tsx` |
| A | `frontend/src/components/Logo.tsx` |
| M | `frontend/src/components/Sidebar.tsx` |
| A | `frontend/src/components/Topbar.tsx` |
| A | `frontend/src/components/calendar/DayView.tsx` |
| A | `frontend/src/components/calendar/EventModal.tsx` |
| A | `frontend/src/components/calendar/MonthView.tsx` |
| A | `frontend/src/components/calendar/TimeGrid.tsx` |
| A | `frontend/src/components/calendar/WeekView.tsx` |
| A | `frontend/src/components/tasks/TaskEditModal.tsx` |
| A | `frontend/src/components/ui/Badge.tsx` |
| A | `frontend/src/components/ui/Button.tsx` |
| A | `frontend/src/components/ui/Card.tsx` |
| A | `frontend/src/components/ui/Drawer.tsx` |
| A | `frontend/src/components/ui/EmptyState.tsx` |
| A | `frontend/src/components/ui/Modal.tsx` |
| A | `frontend/src/components/ui/ProgressBar.tsx` |
| A | `frontend/src/components/ui/SectionHeader.tsx` |
| A | `frontend/src/components/ui/Skeleton.tsx` |
| A | `frontend/src/components/ui/Tabs.tsx` |
| A | `frontend/src/components/ui/TextField.tsx` |
| A | `frontend/src/components/ui/Tooltip.tsx` |
| A | `frontend/src/components/ui/index.ts` |
| M | `frontend/src/contexts/AuthContext.tsx` |
| A | `frontend/src/contexts/BreadcrumbContext.tsx` |
| A | `frontend/src/hooks/useCountUp.ts` |
| A | `frontend/src/hooks/useMediaQuery.ts` |
| M | `frontend/src/index.css` |
| A | `frontend/src/lib/calendar.ts` |
| A | `frontend/src/lib/date.ts` |
| A | `frontend/src/lib/insights.ts` |
| A | `frontend/src/lib/materials.ts` |
| A | `frontend/src/lib/pomodoro.ts` |
| A | `frontend/src/lib/tasks.ts` |
| A | `frontend/src/pages/Calendar.tsx` |
| A | `frontend/src/pages/ComingSoon.tsx` |
| M | `frontend/src/pages/Dashboard.tsx` |
| A | `frontend/src/pages/FocusMode.tsx` |
| M | `frontend/src/pages/ForgotPassword.tsx` |
| M | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/pages/Login.tsx` |
| A | `frontend/src/pages/Materials.tsx` |
| M | `frontend/src/pages/Register.tsx` |
| A | `frontend/src/pages/StudyPlanner.tsx` |
| M | `frontend/src/pages/SubjectDetail.tsx` |
| M | `frontend/src/pages/Subjects.tsx` |
| M | `frontend/src/pages/Tasks.tsx` |
| M | `frontend/src/types/index.ts` |
| A | `openspec.md` |

</details>

<a id="commit-8e2e953"></a>
### HIST-016 — `8e2e953` — Mescla atualizações remotas e adiciona documentação do banco

**Autoria:** 2026-10-13T21:03:02-03:00 · **Diff:** [8e2e953](https://github.com/Vini-cods/EduTrack/commit/8e2e9533e5cad8cc1b80670311b7b9bbecdc0f24) · **Arquivos:** 3.
**Merge; pais:** `b03058c`, `02af587`. Integração contra o primeiro pai; sem duplicar a entrega dos commits de origem.

**Objetivo e entrega:** merge de SQL/dicionário e resolução do snapshot local — 13/10/2026

**Código e evolução:**

- Pais: `b03058c` (primeiro) e `02af587` (segundo). Integra SQL e dicionário da linha remota e resolve conflito do arquivo SQLite mantendo a versão remota.
- Evidência: mensagem do merge explicita manter banco remoto; diff contra primeiro pai acrescenta T-SQL/dicionário e altera o binário. Não é implantação ou migration Alembic comprovada e não permite inferir preservação de registros.

**Especificação resultante:** Integrar documentação SQL/dicionário e registrar a resolução histórica do binário; merge não prova migração ou preservação de dados.

**Validação e evidência:** Validação/limite: nenhum teste próprio ou relatório de preservação é acrescentado. Registrar como integração histórica e dívida de versionar banco, sanada posteriormente em cc96176.

**Limites e continuidade:** Não inferir execução ou homologação a partir do título; considerar o escopo do snapshot histórico.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/edutrack.db` — binário histórico; dados não reproduzidos |
| A | `backend/edutrack_ssms.sql` |
| A | `dicionario_de_dados.md` |

</details>

<a id="commit-879c43b"></a>
### HIST-017 — `879c43b` — Amplia painel, anotações e navegação acadêmica

**Autoria:** 2026-10-13T22:56:05-03:00 · **Diff:** [879c43b](https://github.com/Vini-cods/EduTrack/commit/879c43bc7a9f91abce1f554cf10844cfe22d34e6) · **Arquivos:** 60.

**Objetivo e entrega:** tornar o painel operacional e concluir áreas antes placeholder.

**Código e evolução:**

- Frontend: Dashboard vira composição menor com `useDashboard`, API dashboard e regras puras `dashboardPriorities` (prazo/prioridade com dedup por ID), `dashboardAgenda` (inclui em curso/meia-noite) e `dashboardDeadlines` (próximos 14 dias). Adiciona PriorityTasks, TodayAgenda, UpcomingDeadlines e AcademicMetric. Notes ganha página, `NoteEditor`, `useNotes`, API, tipos e lib; Settings ganha seleção de aparência. A Command Palette navega para carga e cria Notes; Topbar e Sidebar acompanham rotas.
- Arquitetura/identidade: `App.tsx` usa lazy por página; `RouteContent` compõe Suspense/loading e PageBoundary com recuperação por rota. Marca passa a símbolo refinado com variantes crimson/graphite/dark e SVGs contendo máscara raster, documentação de procedência e favicon; não é vetorização Bézier. Logo completa continua nas páginas públicas enquanto internas usam símbolo.
- Backend/integridade: revisão no-op `079be52cae26` reconhece a identidade de bancos legados entre baseline e calendário. Consulta de eventos adota intervalo [start,end), inclusive casos pontuais/fim à meia-noite e janela vazia. NoteResponse expõe timestamps UTC; nota vinculada à sessão preserva contexto histórico, enquanto notas de tarefa sem sessão acompanham mudança de disciplina da tarefa.
- Calendário: `eventsOnDay`, `isOutsideTimeGrid` e `layoutDayEvents` recortam intervalos por dia e tornam eventos anteriores à grade acessíveis sem inventar horários; adiciona testes de meia-noite e bordas.

**Especificação resultante:** Dashboard deve priorizar ações reais; Notes deve guardar texto/contexto e preservar história de sessão; intervalos de calendário usam [início,fim); legado deve atualizar sem recriar core; páginas carregam por rota com recuperação.

**Validação e evidência:** acrescenta backend tests analytics/notes, expande calendário/migration/conftest e frontend tests analytics/calendarTimeGrid/notes/theme. O status daquele commit declara QA HTTP isolado em 8001/5174 e comandos de teste, mas diz que o resultado final seria registrado após integração; não inventar contagem de testes aprovados para esse commit.

**Limites e continuidade:** Notes é texto simples, sem rich text/anexos. Configurações permanecem locais e a busca da palette ainda é limitada; sincronização, paginação e histórico temporal chegam em 18/10. Banco binário ainda está rastreado até cc96176.

<details><summary>Todos os 60 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `GUIA_DE_EXECUCAO_E_TESTES.md` |
| M | `backend/alembic/README` |
| A | `backend/alembic/versions/079be52cae26_register_legacy_academic_core.py` |
| M | `backend/alembic/versions/96fdd9a96d98_add_calendar_events_table.py` |
| M | `backend/app/api/v1/endpoints/calendar_events.py` |
| M | `backend/app/schemas/note.py` |
| M | `backend/app/services/calendar_event_service.py` |
| M | `backend/app/services/note_service.py` |
| M | `backend/app/services/task_service.py` |
| M | `backend/edutrack.db` — binário histórico; dados não reproduzidos |
| M | `backend/tests/conftest.py` |
| A | `backend/tests/test_analytics.py` |
| M | `backend/tests/test_calendar_events.py` |
| A | `backend/tests/test_notes.py` |
| M | `backend/tests/test_study_session_migration.py` |
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/public/favicon.svg` |
| M | `frontend/src/App.tsx` |
| A | `frontend/src/api/dashboard.ts` |
| A | `frontend/src/api/notes.ts` |
| A | `frontend/src/assets/brand/README.md` |
| A | `frontend/src/assets/brand/edutrack-symbol-crimson.png` |
| A | `frontend/src/assets/brand/edutrack-symbol-dark-background.png` |
| A | `frontend/src/assets/brand/edutrack-symbol-graphite.png` |
| A | `frontend/src/assets/brand/edutrack-symbol-light.svg` |
| A | `frontend/src/assets/brand/edutrack-symbol.svg` |
| M | `frontend/src/components/AuthLayout.tsx` |
| M | `frontend/src/components/CommandPalette.tsx` |
| M | `frontend/src/components/Logo.tsx` |
| A | `frontend/src/components/NoteEditor.tsx` |
| A | `frontend/src/components/RouteContent.tsx` |
| M | `frontend/src/components/Sidebar.tsx` |
| M | `frontend/src/components/Topbar.tsx` |
| M | `frontend/src/components/analytics/AcademicLoadChart.tsx` |
| A | `frontend/src/components/analytics/AcademicMetric.tsx` |
| M | `frontend/src/components/analytics/StudyTrendChart.tsx` |
| M | `frontend/src/components/calendar/EventModal.tsx` |
| M | `frontend/src/components/calendar/MonthView.tsx` |
| M | `frontend/src/components/calendar/TimeGrid.tsx` |
| A | `frontend/src/components/dashboard/PriorityTasks.tsx` |
| A | `frontend/src/components/dashboard/TodayAgenda.tsx` |
| A | `frontend/src/components/dashboard/UpcomingDeadlines.tsx` |
| A | `frontend/src/hooks/useDashboard.ts` |
| A | `frontend/src/hooks/useNotes.ts` |
| M | `frontend/src/index.css` |
| M | `frontend/src/lib/calendar.ts` |
| A | `frontend/src/lib/dashboard.ts` |
| A | `frontend/src/lib/notes.ts` |
| M | `frontend/src/pages/AcademicLoad.tsx` |
| M | `frontend/src/pages/Calendar.tsx` |
| M | `frontend/src/pages/Dashboard.tsx` |
| M | `frontend/src/pages/Insights.tsx` |
| A | `frontend/src/pages/Notes.tsx` |
| A | `frontend/src/pages/Settings.tsx` |
| M | `frontend/src/pages/Tasks.tsx` |
| A | `frontend/src/types/notes.ts` |
| A | `frontend/tests/analytics.test.mjs` |
| A | `frontend/tests/calendarTimeGrid.test.mjs` |
| A | `frontend/tests/notes.test.mjs` |
| A | `frontend/tests/theme.test.mjs` |

</details>

<a id="commit-cc96176"></a>
### HIST-018 — `cc96176` — chore(git): mantém banco SQLite local fora do versionamento

**Autoria:** 2026-10-15T17:38:10-03:00 · **Diff:** [cc96176](https://github.com/Vini-cods/EduTrack/commit/cc961766e5f798607da54b1be9189911b055cbf7) · **Arquivos:** 2.

**Objetivo e entrega:** separar dados locais do código distribuído. Remove o rastreamento de `backend/edutrack.db` e acrescenta padrões de exclusão ao `.gitignore`; não é uma migration nem uma rotina de apagar dados na máquina.

**Código e evolução:**

- Código/especificação: instalações passam a depender das migrations versionadas, em vez de receber um banco pessoal como artefato do Git. Bancos e backups locais ficam fora dos próximos commits.

**Especificação resultante:** Código distribuído não deve incluir banco local, backups ou credenciais; retirar do índice Git não equivale a apagar dados locais.

**Validação e evidência:** Evidência/limite: diff de Git, sem teste executável novo. Remover de HEAD não elimina o binário dos commits antigos; não documentar conteúdo do banco nem dados pessoais desse histórico.

**Limites e continuidade:** Evidência/limite: diff de Git, sem teste executável novo. Remover de HEAD não elimina o binário dos commits antigos; não documentar conteúdo do banco nem dados pessoais desse histórico.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `.gitignore` |
| D | `backend/edutrack.db` — binário histórico; dados não reproduzidos |

</details>

<a id="commit-c10cfcb"></a>
### HIST-019 — `c10cfcb` — feat(subjects): adiciona gestão de disciplinas e cronograma semanal

**Autoria:** 2026-10-15T17:39:26-03:00 · **Diff:** [c10cfcb](https://github.com/Vini-cods/EduTrack/commit/c10cfcbd3d1120b989e52744aa54dc895158dce1) · **Arquivos:** 22.

**Objetivo e entrega:** permitir editar/excluir disciplinas e cadastrar aulas recorrentes por dias da semana e horário, sem duplicar o conceito de agenda.

**Código e evolução:**

- Backend: `SubjectCreate/SubjectUpdate` validam nome não vazio, cor hexadecimal, professor, carga 0–2000 e período; `validate_subject_dates` verifica inclusive PATCH combinado com datas já salvas. `SubjectResponse` mantém registros legados legíveis. `get_events_for_user` recebe filtros `subject_id` e `category`.
- Recorrência: `expand_recurrence` deixa de truncar silenciosamente ao alcançar 260 ocorrências e passa a rejeitar excesso. `_validate_class_duplicates` detecta aula da mesma disciplina/usuário/intervalo; `_commit_events` converte somente a constraint específica em `DuplicateClassError`, com rollback e resposta 409. A série é materializada com `recurrence_group_id`.
- Migration `e6f38a91d420`: cria índice único parcial `uq_calendar_classes_subject_interval`; preflight interrompe em aulas completas duplicadas, sem apagar registros. Predicate contempla SQLite/PostgreSQL/SQL Server, mas homologação registrada é SQLite.
- Frontend: extrai `SubjectFormModal`, `SubjectDeleteModal`, `ClassSchedule` e `ClassScheduleFormModal`; `classSchedule.ts` calcula datas locais, valida horários/período, prévia e payload de aulas; `CLASS_WEEKDAYS`, máximo 260 e janela 366 dias. Subjects/SubjectDetail/Calendar reutilizam esses componentes e o formulário existente de tarefas.

**Especificação resultante:** Aulas pertencem a uma disciplina do usuário, usam dias/horários e intervalo letivo; a série inteira é criada ou rejeitada e duplicatas exatas recebem conflito.

**Validação e evidência:** Testes novos: `test_class_index.py`, `test_subject_schedule.py`, `classSchedule.test.mjs`; contratos, duplicatas, índices/migration e datas. A rodada documentada em 81e6f86 registra 129 backend/50 frontend, type-check/build e 27 verificações HTTP isoladas. Limites: editar é por ocorrência; substituir grade exige excluir série/cadastrar outra; feriados manuais e aula cruzando meia-noite em dois blocos no formulário.

**Limites e continuidade:** Testes novos: `test_class_index.py`, `test_subject_schedule.py`, `classSchedule.test.mjs`; contratos, duplicatas, índices/migration e datas. A rodada documentada em 81e6f86 registra 129 backend/50 frontend, type-check/build e 27 verificações HTTP isoladas. Limites: editar é por ocorrência; substituir grade exige excluir série/cadastrar outra; feriados manuais e aula cruzando meia-noite em dois blocos no formulário.

<details><summary>Todos os 22 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `backend/alembic/versions/e6f38a91d420_unique_scheduled_classes.py` |
| M | `backend/app/api/v1/endpoints/calendar_events.py` |
| M | `backend/app/api/v1/endpoints/subjects.py` |
| M | `backend/app/models/calendar_event.py` |
| M | `backend/app/schemas/calendar_event.py` |
| M | `backend/app/schemas/subject.py` |
| M | `backend/app/services/calendar_event_service.py` |
| M | `backend/app/services/subject_service.py` |
| A | `backend/tests/test_class_index.py` |
| M | `backend/tests/test_study_session_migration.py` |
| A | `backend/tests/test_subject_schedule.py` |
| A | `frontend/src/components/subjects/ClassSchedule.tsx` |
| A | `frontend/src/components/subjects/ClassScheduleFormModal.tsx` |
| A | `frontend/src/components/subjects/SubjectDeleteModal.tsx` |
| A | `frontend/src/components/subjects/SubjectFormModal.tsx` |
| M | `frontend/src/components/tasks/TaskFormModal.tsx` |
| A | `frontend/src/lib/classSchedule.ts` |
| M | `frontend/src/pages/Calendar.tsx` |
| M | `frontend/src/pages/SubjectDetail.tsx` |
| M | `frontend/src/pages/Subjects.tsx` |
| M | `frontend/src/types/index.ts` |
| A | `frontend/tests/classSchedule.test.mjs` |

</details>

<a id="commit-a43928e"></a>
### HIST-020 — `a43928e` — feat(dashboard): apresenta gráficos semanais de estudo e carga

**Autoria:** 2026-10-15T17:39:28-03:00 · **Diff:** [a43928e](https://github.com/Vini-cods/EduTrack/commit/a43928e627ae4a402efb61d6b5dc1301fb364261) · **Arquivos:** 2.

**Objetivo e entrega:** mostrar planejamento versus execução e dias mais carregados no Dashboard, usando os mesmos dados e gráficos de Insights/Academic Load.

**Código e evolução:**

- Código: novo `DashboardWeeklyCharts` recebe `data/loading/error/reload` já disponíveis; integra `StudyTrendChart` e `AcademicLoadChart`, totais agendado/realizado/carga/capacidade e ações para Planner, Insights e carga. Skeletons, `aria-busy`, alertas e recarregar se API falha.

**Especificação resultante:** Especificação: somente sessões concluídas contam como realizado; dias futuros mostram planejamento; estimativas cobertas por blocos entram uma vez; estimativas desconhecidas são sinalizadas. Sem endpoint/dependência/migration novos. Validação integrada registrada em 81e6f86; a inspeção visual final desses gráficos naquela rodada ficou limitada pela conexão da prévia.

**Validação e evidência:** Sem execução nova de testes nesta auditoria; ver os testes e registros históricos associados à rodada.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `frontend/src/components/dashboard/DashboardWeeklyCharts.tsx` |
| M | `frontend/src/pages/Dashboard.tsx` |

</details>

<a id="commit-de95b44"></a>
### HIST-021 — `de95b44` — fix(ui): melhora contraste e cabeçalho em telas pequenas

**Autoria:** 2026-10-15T17:39:30-03:00 · **Diff:** [de95b44](https://github.com/Vini-cods/EduTrack/commit/de95b44aa3cee2ecf79eb53e808c0bf3396d29c6) · **Arquivos:** 3.

**Objetivo e entrega:** evitar a busca empurrar controles de conta no mobile e manter tokens visuais legíveis nos dois temas.

**Código e evolução:**

- Código: `Topbar` aplica `min-w-0` ao botão/rótulo da busca e `aria-label` de pesquisa; `ProgressBar` usa cores via CSS variables efetivamente resolvidas; `index.css` escurece texto auxiliar (`--color-muted` para #716d66 no claro) e substitui a cor fixa do skeleton pelo token de borda.

**Especificação resultante:** Contraste e cabeçalho devem continuar legíveis no modo escuro e em telas pequenas, sem alterar regras acadêmicas.

**Validação e evidência:** Evidência/limite: mudança de apresentação de três arquivos, sem regra de negócio/API. Validação incluída no estado integrado de 81e6f86, não é nova feature acadêmica.

**Limites e continuidade:** Evidência/limite: mudança de apresentação de três arquivos, sem regra de negócio/API. Validação incluída no estado integrado de 81e6f86, não é nova feature acadêmica.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/Topbar.tsx` |
| M | `frontend/src/components/ui/ProgressBar.tsx` |
| M | `frontend/src/index.css` |

</details>

<a id="commit-81e6f86"></a>
### HIST-022 — `81e6f86` — docs: registra estado do produto e fluxo de commits incrementais

**Autoria:** 2026-10-15T17:40:12-03:00 · **Diff:** [81e6f86](https://github.com/Vini-cods/EduTrack/commit/81e6f86d96ddcbdf5fe51f91104312560e39e7a1) · **Arquivos:** 4.

**Objetivo e entrega:** tornar execução, limites e fluxo de entrega coerentes com o produto existente.

**Código e evolução:**

- Arquivos: cria `AGENTS.md`; atualiza guia de execução então existente, `docs/DEVELOPMENT_STATUS.md` e procedência da marca. Especifica commits pequenos por unidade validada, diff intencional, preservação do usuário, segredos/bancos fora do Git e push somente autorizado.

**Especificação resultante:** Manter estado técnico atualizado e dividir alterações independentes em commits descritivos.

**Validação e evidência:** Evidências históricas registradas: 129 testes backend/50 frontend, type-check/build; 27 verificações HTTP em banco temporário; migrations após backup e ensaio em cópia com SHA256 e foreign_key_check; navegador para login/Dashboard/temas/Notes, com limite de acesso à prévia para grade/gráficos. Não são testes novos criados pelo commit de documentação.

**Limites e continuidade:** tornar execução, limites e fluxo de entrega coerentes com o produto existente. Evidências históricas registradas: 129 testes backend/50 frontend, type-check/build; 27 verificações HTTP em banco temporário; migrations após backup e ensaio em cópia com SHA256 e foreign_key_check; navegador para login/Dashboard/temas/Notes, com limite de acesso à prévia para grade/gráficos. Não são testes novos criados pelo commit de documentação.

<details><summary>Todos os 4 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `AGENTS.md` |
| M | `GUIA_DE_EXECUCAO_E_TESTES.md` |
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/src/assets/brand/README.md` |

</details>

<a id="commit-d91f096"></a>
### HIST-023 — `d91f096` — feat(auth): cria experiência de entrada acadêmica interativa

**Autoria:** 2026-10-15T17:58:28-03:00 · **Diff:** [d91f096](https://github.com/Vini-cods/EduTrack/commit/d91f096c8d6df89a7699a9cceb80ff3e82990822) · **Arquivos:** 7.

**Objetivo e entrega:** dar identidade editorial à entrada preservando o formulário e a autenticação.

**Código e evolução:**

- Código: `AuthLayout` e CSS compartilhado compõem prévia `AcademicPreview` com Organizar/Focar/Evoluir, seleção por teclado e SVG motion. Login ganha validação após interação, Caps Lock, foco do primeiro erro e alvo 44 px para revelar senha; Register preserva confirmação e bloqueio de envios. A prévia é ilustrativa, sem dados acadêmicos reais, e o formulário vem primeiro no mobile.

**Especificação resultante:** Compartilhar a experiência pública e oferecer interação responsiva sem impedir teclado, tema ou movimento reduzido.

**Validação e evidência:** O registro posterior da rodada em 9ac043a inclui type-check/build e cenários de acesso; a experiência AcademicPreview é substituída em e214a9e. Não houve nova execução nesta auditoria.

**Limites e continuidade:** Validação histórica: mensagem/estado registram 50 testes frontend, type-check/build, revisão em navegador nos temas e 320/390/768 px; reduced motion revisado em CSS sem mudar preferência do sistema. Limite temporal: a prévia e seus dois arquivos foram removidos/substituídos pelo portal centralizado em e214a9e; não descrever como UI atual.

<details><summary>Todos os 7 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/src/components/AuthLayout.tsx` |
| A | `frontend/src/components/auth/AcademicPreview.css` |
| A | `frontend/src/components/auth/AcademicPreview.tsx` |
| A | `frontend/src/components/auth/AuthLayout.css` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/Register.tsx` |

</details>

<a id="commit-a740351"></a>
### HIST-024 — `a740351` — feat: adiciona registros acadêmicos e recuperação de senha

**Autoria:** 2026-10-15T22:12:17-03:00 · **Diff:** [a740351](https://github.com/Vini-cods/EduTrack/commit/a740351d98ac9fd4611b41739692269482ed649f) · **Arquivos:** 49.

**Objetivo e entrega:** implementar plano de ensino e avaliações, fechar o fluxo de recuperação, ampliar busca e corrigir falhas de Materials. Commit transversal, 49 arquivos; título não descreve toda a abrangência.

**Código e evolução:**

- Models/migration: `SubjectSyllabus` (um por disciplina; objetivos, tópicos, bibliografia) e `Assessment` (nome, nota opcional, máximo, peso, tarefa opcional), migration aditiva `f3a7bf247110`. Constraints impõem máximo/peso positivos e nota entre zero e máximo; excluir disciplina faz cascade, excluir tarefa desvincula avaliação.
- API em `academic_records.py`: ownership por `owned_subject`, GET/PUT `/subjects/{id}/syllabus`, GET/POST `/subjects/{id}/assessments`, PUT/DELETE item; plano concorrente com violação de unicidade retorna 409. `save_assessment` exige tarefa da mesma conta/disciplina; `assessment_response` não expõe contexto cruzado inconsistente; `summarize_grades` calcula média parcial normalizada 0–10 ponderada e cobertura dos pesos. Nota zero é válida, vazio permanece pendente e prazo é reutilizado de Task, sem segunda cópia.
- UI acadêmica: `academicRecordsApi`, `useAcademicRecords`, validações puras em `lib/academicRecords.ts`; `SubjectAcademicRecords`, cards/formulários/delete/discard de Syllabus/Assessment. Descartar rascunhos exige confirmação. Não impõe aprovação/recuperação de instituição.
- Recuperação: schemas e validação de senha, `create_password_reset_token`/`verify_password_reset_token` com finalidade/expiração/fingerprint do hash; `reset_password` usa UPDATE condicional e invalida links anteriores ao mudar a senha. `prepare_password_reset` devolve resposta genérica e link em fragmento para não levar token ao GET/logs. SMTP pela stdlib com TLS/SSL/timeout, sem logar conteúdo/destinatário; endpoints de pedido/redefinição, `ForgotPassword`, `ResetPassword`, `authRecoveryApi`, helpers e rota nova em App.
- Busca/UI: `commandSearch.ts` normaliza acentos e termos/tags, indexa subjects/tasks/notes/materials, limita consulta a 200 caracteres e até 5 por tipo, ordena relevância e gera contexto/excerpt/link highlight. `CommandPalette` usa isso e oferece retry parcial; Notes/Materials recebem realce/navegação ao resultado. Materials encerra loading em erro e só reconcilia status/exclusão após API, com proteção contra duplo envio. A busca ainda era snapshot local; paginação/busca servidora só vieram em 5396474.

**Especificação resultante:** Operação naquela versão: `RecoveryRateLimiter` usa HMAC para chaves, lock e janelas por e-mail/IP em memória; envio com BackgroundTasks. Sem SMTP retorna 503; 202 não prova entrega; fila não persistia/retry não existia e rate limit era por processo. Essas limitações foram tratadas posteriormente em 7773573; tokens de acesso já emitidos seguem válidos até expirar.

**Validação e evidência:** Testes novos: `test_academic_records.py`, `test_password_reset.py`, `academicRecords.test.mjs`, `authRecovery.test.mjs`, `commandSearch.test.mjs`. Validação integrada associada em 9ac043a registra 175 backend/71 frontend, type-check/build, migration ensaiada/aplicada com preservação e QA isolado, sem entrega SMTP externa.

<details><summary>Todos os 49 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/.env.example` |
| M | `backend/alembic/env.py` |
| A | `backend/alembic/versions/f3a7bf247110_academic_records.py` |
| A | `backend/app/api/v1/endpoints/academic_records.py` |
| M | `backend/app/api/v1/endpoints/auth.py` |
| M | `backend/app/api/v1/router.py` |
| M | `backend/app/core/config.py` |
| M | `backend/app/core/security.py` |
| M | `backend/app/models/__init__.py` |
| A | `backend/app/models/academic_record.py` |
| M | `backend/app/models/subject.py` |
| M | `backend/app/models/task.py` |
| A | `backend/app/schemas/academic_record.py` |
| M | `backend/app/schemas/user.py` |
| A | `backend/app/services/academic_record_service.py` |
| A | `backend/app/services/email_service.py` |
| A | `backend/app/services/password_reset_service.py` |
| M | `backend/app/services/task_service.py` |
| A | `backend/tests/test_academic_records.py` |
| A | `backend/tests/test_password_reset.py` |
| M | `frontend/src/App.tsx` |
| A | `frontend/src/api/academicRecords.ts` |
| A | `frontend/src/api/authRecovery.ts` |
| M | `frontend/src/components/AuthLayout.tsx` |
| M | `frontend/src/components/CommandPalette.tsx` |
| A | `frontend/src/components/subjects/AssessmentDeleteModal.tsx` |
| A | `frontend/src/components/subjects/AssessmentFormModal.tsx` |
| A | `frontend/src/components/subjects/AssessmentsCard.tsx` |
| A | `frontend/src/components/subjects/DiscardAcademicChangesModal.tsx` |
| A | `frontend/src/components/subjects/SubjectAcademicRecords.tsx` |
| M | `frontend/src/components/subjects/SubjectDeleteModal.tsx` |
| A | `frontend/src/components/subjects/SyllabusCard.tsx` |
| A | `frontend/src/components/subjects/SyllabusFormModal.tsx` |
| A | `frontend/src/hooks/useAcademicRecords.ts` |
| A | `frontend/src/lib/academicRecords.ts` |
| A | `frontend/src/lib/authRecovery.ts` |
| A | `frontend/src/lib/commandSearch.ts` |
| A | `frontend/src/lib/password.ts` |
| M | `frontend/src/pages/ForgotPassword.tsx` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/Materials.tsx` |
| M | `frontend/src/pages/Notes.tsx` |
| M | `frontend/src/pages/Register.tsx` |
| A | `frontend/src/pages/ResetPassword.tsx` |
| M | `frontend/src/pages/SubjectDetail.tsx` |
| A | `frontend/src/types/academicRecords.ts` |
| A | `frontend/tests/academicRecords.test.mjs` |
| A | `frontend/tests/authRecovery.test.mjs` |
| A | `frontend/tests/commandSearch.test.mjs` |

</details>

<a id="commit-45e9d6a"></a>
### HIST-025 — `45e9d6a` — fix(academics): limita espera ao carregar plano e avaliações

**Autoria:** 2026-10-16T17:15:42-03:00 · **Diff:** [45e9d6a](https://github.com/Vini-cods/EduTrack/commit/45e9d6a1e87094b0e4c503454b0a283666bb60c5) · **Arquivos:** 1.

**Objetivo e entrega:** consultas sem resposta não podem deixar plano/avaliações eternamente carregando.

**Código e evolução:**

- Código: `academicRecordsApi.getSyllabus` e `getAssessments` recebem `timeout: 15_000` no Axios, mantendo AbortSignal. Timeout permite erro/nova tentativa já existentes; gravações não foram reescritas.

**Especificação resultante:** Leituras de plano e avaliações devem encerrar espera por timeout e permitir tratamento de erro/nova tentativa.

**Validação e evidência:** Validação histórica declarada na mensagem: 71 testes frontend, type-check e build aprovados. Sem alteração backend/migration.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/api/academicRecords.ts` |

</details>

<a id="commit-9ac043a"></a>
### HIST-026 — `9ac043a` — docs: registra entrega acadêmica e configuração da recuperação

**Autoria:** 2026-10-16T17:27:13-03:00 · **Diff:** [9ac043a](https://github.com/Vini-cods/EduTrack/commit/9ac043a74cd3f01a9496cba75ce5819db75ce3a8) · **Arquivos:** 2.

**Objetivo e entrega:** documentar os contratos, limites e operação das funcionalidades do commit transversal anterior.

**Código e evolução:**

- Arquivos: `docs/DEVELOPMENT_STATUS.md` e novo `docs/PASSWORD_RECOVERY.md`; configuração SMTP, respostas, uso único, expiração, limites por processo e ausência de fila/retry naquela data, falta de revogação dos JWT de acesso.

**Especificação resultante:** Registrar uso e limites de plano, avaliações e recuperação SMTP sem confundir documentação com infraestrutura publicada.

**Validação e evidência:** Evidências registradas: 175 testes backend/71 frontend, type-check/build; migration f3a em vazio/legado/cópia/original com backup e SHA256/foreign_key_check; QA em SQLite temporário 8001/5174 para plano, avaliação zero/média, busca de conteúdo Notes/Materials com teclado/destaque, mobile 320/390, Materials com API desligada, recuperação indisponível sem SMTP e reset sem token. Sem alterar credencial real nem e-mail externo. Não confundir esse registro histórico com uma nova execução durante a auditoria.

**Limites e continuidade:** documentar os contratos, limites e operação das funcionalidades do commit transversal anterior. Arquivos: `docs/DEVELOPMENT_STATUS.md` e novo `docs/PASSWORD_RECOVERY.md`; configuração SMTP, respostas, uso único, expiração, limites por processo e ausência de fila/retry naquela data, falta de revogação dos JWT de acesso. Evidências registradas: 175 testes backend/71 frontend, type-check/build; migration f3a em vazio/legado/cópia/original com backup e SHA256/foreign_key_check; QA em SQLite temporário 8001/5174 para plano, avaliação zero/média, busca de conteúdo Notes/Materials com teclado/destaque, mobile 320/390, Materials com API desligada, recuperação indisponível sem SMTP e reset sem token. Sem alterar credencial real nem e-mail externo. Não confundir esse registro histórico com uma nova execução durante a auditoria.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |
| A | `docs/PASSWORD_RECOVERY.md` |

</details>

<a id="commit-e214a9e"></a>
### HIST-027 — `e214a9e` — feat(auth): adota portal centralizado com acesso em etapas

**Autoria:** 2026-10-17T14:50:29-03:00 · **Diff:** [e214a9e](https://github.com/Vini-cods/EduTrack/commit/e214a9e10ee0a8f6f132e1bb565947e525f37941) · **Arquivos:** 9.

**Objetivo e entrega:** entrada centralizada, compacta e consistente, inspirada estruturalmente no portal SENAI sem usar marca/ativos dele.

**Código e evolução:**

- Código: remove `AcademicPreview.tsx/.css`; reorganiza `AuthLayout` e CSS; cria `AuthBackdrop` SVG decorativo, `AuthHelp` e `AuthIdentitySummary`. Cubos/matriz/estrelas/rede própria, efeito de ponteiro via requestAnimationFrame só sob demanda, ponteiro fino e sem movimento reduzido; limpa listeners/rAF.
- Login separa e-mail e senha; Register separa nome/e-mail e senha/confirmação. `submitStep` valida localmente o trecho, e só o envio final chama autenticação/cadastro; voltar preserva RHF (`shouldUnregister:false`) e foco. `fieldset key={step}` impede reutilização indevida do input entre etapas, mantendo valores. Primeira etapa não consulta se e-mail existe e não adiciona CPF.
- Teclado, Caps Lock, mostrar senha 44 px, validação e bloqueio de envio preservados. Evidência histórica do QA dessa rodada em c813e9f: 71 testes frontend/type-check/build e fluxos em ambos os temas/320/390 px; nenhuma API modificada.

**Especificação resultante:** Só enviar autenticação/cadastro na última etapa; voltar preserva dados e foco e a etapa inicial não consulta a existência de e-mail.

**Validação e evidência:** c813e9f registra 71 testes frontend, type-check/build e QA de etapas, foco, retorno, validação e temas em 320/390 px. Não é uma nova execução nesta edição.

<details><summary>Todos os 9 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/AuthLayout.tsx` |
| D | `frontend/src/components/auth/AcademicPreview.css` |
| D | `frontend/src/components/auth/AcademicPreview.tsx` |
| A | `frontend/src/components/auth/AuthBackdrop.tsx` |
| A | `frontend/src/components/auth/AuthHelp.tsx` |
| A | `frontend/src/components/auth/AuthIdentitySummary.tsx` |
| M | `frontend/src/components/auth/AuthLayout.css` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/Register.tsx` |

</details>

<a id="commit-c813e9f"></a>
### HIST-028 — `c813e9f` — docs(auth): registra novo portal e validações de acesso

**Autoria:** 2026-10-17T14:50:38-03:00 · **Diff:** [c813e9f](https://github.com/Vini-cods/EduTrack/commit/c813e9f772b61f4c5ae8d4729121d54cae834a14) · **Arquivos:** 1.

**Objetivo e entrega:** somente `docs/DEVELOPMENT_STATUS.md`; atualiza direção visual, etapas e limites da experiência anterior.

**Código e evolução:**

- Alteração documental ou de integração delimitada pelos arquivos abaixo; não cria por si só um fluxo executável novo.

**Especificação resultante:** Documentar o portal em etapas e os cenários realmente conferidos naquela rodada.

**Validação e evidência:** Evidência histórica: 71 testes frontend, type-check/build; e-mail inválido impede avanço, Enter/foco/voltar, preservar nome/e-mail, revelar senha, credenciais inválidas, validação no cadastro, ajuda com Escape e restauração de foco, temas e 320/390 px sem overflow. Recuperação compartilha layout. Reduced motion revisado no código sem alterar SO; dados sintéticos inválidos no login, sem criar contas ou mudar credenciais/API/banco.

**Limites e continuidade:** Arquivo: somente `docs/DEVELOPMENT_STATUS.md`; atualiza direção visual, etapas e limites da experiência anterior.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |

</details>

<a id="commit-7cbabaa"></a>
### HIST-029 — `7cbabaa` — feat(auth): aplica marca completa nas telas de entrada

**Autoria:** 2026-10-17T17:52:59-03:00 · **Diff:** [7cbabaa](https://github.com/Vini-cods/EduTrack/commit/7cbabaa0e5f20a2aaac8d43bf2b3f93f556a6b1a) · **Arquivos:** 4.

**Objetivo e entrega:** usar símbolo/nome/slogan nítidos na entrada, mantendo somente símbolo dentro do sistema.

**Código e evolução:**

- Código: novo `AuthBrand.tsx/.css`; compõe a máscara/silhueta existente do símbolo com EDUTRACK e slogan renderizados como texto da interface, em vez de esticar o JPEG. `AuthLayout` centraliza essa marca e elimina marca pequena/duplicada; CSS adapta claro/escuro e responsividade.

**Especificação resultante:** Contrato: composição completa restrita à entrada; a marca interna e favicon permanecem só símbolo. Evidências históricas de aparência e build são registradas no commit documental 3caea48, sem nova API.

**Validação e evidência:** 3caea48 registra type-check/build, teclado na marca, temas e tamanhos pequenos. A auditoria atual confirma o código, sem reexecutar o navegador.

<details><summary>Todos os 4 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/AuthLayout.tsx` |
| A | `frontend/src/components/auth/AuthBrand.css` |
| A | `frontend/src/components/auth/AuthBrand.tsx` |
| M | `frontend/src/components/auth/AuthLayout.css` |

</details>

<a id="commit-6b6039a"></a>
### HIST-030 — `6b6039a` — feat(auth): anima conexões e pulsos do fundo

**Autoria:** 2026-10-17T17:53:18-03:00 · **Diff:** [6b6039a](https://github.com/Vini-cods/EduTrack/commit/6b6039ad09d7e19e923c1340b40123ee0e5b8f67) · **Arquivos:** 3.

**Objetivo e entrega:** acrescentar movimento às linhas/nós já decorativos, sem dependência ou render React por quadro.

**Código e evolução:**

- Código: `AuthBackdrop` passa a gerar quatro conexões SVG com trilho estático, traço móvel normalizado `pathLength=100`, ritmos 10–14 s/delays próprios e círculos pulsantes; novo `AuthNetwork.css` com dasharray/dashoffset e keyframes. Claro/escuro por tokens, reduced motion esconde sinal móvel e mantém nós estáticos.

**Especificação resultante:** Na versão inicial de motion, sinais SVG animados respeitam tokens e movimento reduzido; essa técnica é substituída depois por Canvas.

**Validação e evidência:** Validação histórica da mensagem: type-check/build e offsets observados em navegador. Solução substituída por partículas Canvas em 1044f08; não descrever o traço sobre caminho SVG como implementação atual.

**Limites e continuidade:** Validação histórica da mensagem: type-check/build e offsets observados em navegador. Solução substituída por partículas Canvas em 1044f08; não descrever o traço sobre caminho SVG como implementação atual.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/auth/AuthBackdrop.tsx` |
| M | `frontend/src/components/auth/AuthLayout.css` |
| A | `frontend/src/components/auth/AuthNetwork.css` |

</details>

<a id="commit-3caea48"></a>
### HIST-031 — `3caea48` — docs(auth): registra marca de entrada e motion das conexões

**Autoria:** 2026-10-17T17:54:17-03:00 · **Diff:** [3caea48](https://github.com/Vini-cods/EduTrack/commit/3caea486a8f87fc09efc9d655d6695038dcbb756) · **Arquivos:** 2.

**Objetivo e entrega:** estado de desenvolvimento e README de procedência da marca. Documenta símbolo+tipografia completa restrita a AuthLayout e trilhos/sinais/nós SVG com reduced motion.

**Código e evolução:**

- Natureza: evidência da rodada visual e de TypeScript/build, não implementação nova. Registro histórico da rede SVG torna-se anterior à substituição Canvas de 1044f08/f2ed1c3.

**Especificação resultante:** Registrar procedência da marca, restrição do nome/slogan à entrada e validações da animação SVG daquela versão.

**Validação e evidência:** O documento registra type-check/build, navegação por teclado, temas e 320/390 px; offsets SVG foram observados. Reduced motion foi revisado, sem alterar a preferência do sistema.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/src/assets/brand/README.md` |

</details>

<a id="commit-1044f08"></a>
### HIST-032 — `1044f08` — feat(auth): cria rede orgânica de partículas por proximidade

**Autoria:** 2026-10-17T18:08:53-03:00 · **Diff:** [1044f08](https://github.com/Vini-cods/EduTrack/commit/1044f0855d78561a3513de31636618e3359b7128) · **Arquivos:** 3.

**Objetivo e entrega:** substituir o efeito de sinais presos a caminhos SVG por uma rede com movimento mais natural.

**Código e evolução:**

- Código: novo `AuthNetwork.tsx` com Canvas 2D e `createParticle`; posições, velocidades e raios ficam fora do estado React. Desenha conexões para pares próximos com alfa por distância; velocidades 8–12 px/s, delta limitado a 0,05 s, desenho a até 30 fps.
- Performance/acessibilidade: 18 partículas abaixo de 640 px e 24–36 no desktop conforme área; DPR até 1,5; ResizeObserver reescala posições; MutationObserver atualiza cor do tema sem reiniciar rede; pausa em aba oculta e mantém quadro estático em reduced motion; cleanup cancela rAF, observers/listeners. Preserva cubos SVG e ponteiro do backdrop.

**Especificação resultante:** Mover partículas/conexões por proximidade fora do estado React por quadro, com densidade/DPR/fps limitados e limpeza de recursos.

**Validação e evidência:** Validação histórica correspondente em f2ed1c3: TypeScript/build, quadros sucessivos claro/escuro e Canvas em 320/390 px; paths de pausa/reduced-motion/cleanup revisados no código. Sem WebGL/dependências novas.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/auth/AuthBackdrop.tsx` |
| M | `frontend/src/components/auth/AuthNetwork.css` |
| A | `frontend/src/components/auth/AuthNetwork.tsx` |

</details>

<a id="commit-f2ed1c3"></a>
### HIST-033 — `f2ed1c3` — docs(auth): registra rede dinâmica e validação visual

**Autoria:** 2026-10-17T18:08:57-03:00 · **Diff:** [f2ed1c3](https://github.com/Vini-cods/EduTrack/commit/f2ed1c3624847910e3115da50b2faf6b96d84911) · **Arquivos:** 1.

**Objetivo e entrega:** `docs/DEVELOPMENT_STATUS.md`; atualiza rede Canvas, parâmetros de densidade/DPR/fps, pausa por visibilidade e modo estático.

**Código e evolução:**

- Alteração documental ou de integração delimitada pelos arquivos abaixo; não cria por si só um fluxo executável novo.

**Especificação resultante:** Distinguir movimento observado no navegador de reduced motion e pausa por visibilidade revisados somente no código.

**Validação e evidência:** Evidência histórica: type-check/build, quadros sucessivos nos dois temas e Canvas sem overflow em 320/390 px. Pausa, quadro estático, cleanup e limitação de delta revisados em código; preferência de movimento do SO não foi alterada. Não atribuir teste real de reduced motion a essa rodada.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |

</details>

<a id="commit-9651b28"></a>
### HIST-034 — `9651b28` — fix(auth): reforça contraste das partículas e conexões

**Autoria:** 2026-10-17T20:08:41-03:00 · **Diff:** [9651b28](https://github.com/Vini-cods/EduTrack/commit/9651b28e3c893098a3b0df6aa9830e683cc3789a) · **Arquivos:** 3.

**Objetivo e entrega:** tornar a rede existente mais visível, sem mudar movimento/densidade.

**Código e evolução:**

- Código: CSS troca crimson por #ba243b no claro e #f05a70 no escuro. Canvas eleva largura das linhas de 0,8 para 1 px, alfa máximo das conexões de 0,38 para 0,68 e dos pontos de 0,72 para 0,96; mantém atenuação por proximidade.

**Especificação resultante:** Reforçar visibilidade da rede sem mudar sua densidade ou custo de animação.

**Validação e evidência:** Validação histórica declarada: TypeScript/build e revisão visual dos dois temas; documentação atualizada no mesmo commit. Cores/alfa de conexões seriam reforçados novamente em d09b347.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/src/components/auth/AuthNetwork.css` |
| M | `frontend/src/components/auth/AuthNetwork.tsx` |

</details>

<a id="commit-0fec66b"></a>
### HIST-035 — `0fec66b` — feat(analytics): adiciona comparações, padrões e diagnóstico de planejamento

**Autoria:** 2026-10-17T20:50:01-03:00 · **Diff:** [0fec66b](https://github.com/Vini-cods/EduTrack/commit/0fec66be66ac707c334de1b221a0282ac56d6bb0) · **Arquivos:** 4.

**Objetivo e entrega:** produzir análises úteis e explicáveis a partir de dados reais, sem previsões de aprendizagem.

**Código e evolução:**

- Código: separa funções puras no novo `analytics_metrics.py`: `StudyRecord`, `compare_study`, `session_patterns`, `planning_diagnostics`. Amplia schemas com comparação, padrões (dias/horas, duração média/mediana/maior, sequências) e diagnóstico (cobertura, excesso/pico, lacunas). `get_analytics` carrega dados e compõe métricas/insights com ações para Planner/Tasks/Focus/Academic Load.

**Especificação resultante:** Regras: comparação usa trechos equivalentes já transcorridos, intervalo anterior uma janela atrás; dia atual parcial; base zero sem percentual e janela futura sem comparação. Sessões concluídas no futuro são ignoradas. Cobertura usa restante após estudo, limita blocos futuros ao restante por tarefa e não pressupõe caber antes do prazo; lacunas de estimativa/prazo cobrem backlog aberto. Limite histórico: estudo realizado ainda estava atribuído ao dia de início local da sessão, sem segmentos; conclusões eram estado atual das tarefas cujo prazo está na janela, sem histórico de data. Evolução temporal veio em 527dab7. Padrões de horário/duração indicam registros, não eficiência ou horário ideal.

**Validação e evidência:** Testes: adiciona 181 linhas a `test_analytics.py` com comparação, fuso, futuro/basezero, sequência, duração e diagnóstico; não altera schema de banco. Validação integrada posterior 66592bc: 185 backend/84 frontend, mais recorte focado 20/20, sem somá-los como testes independentes.

**Limites e continuidade:** Limite histórico: estudo realizado ainda estava atribuído ao dia de início local da sessão, sem segmentos; conclusões eram estado atual das tarefas cujo prazo está na janela, sem histórico de data. Evolução temporal veio em 527dab7. Padrões de horário/duração indicam registros, não eficiência ou horário ideal.

<details><summary>Todos os 4 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/app/schemas/analytics.py` |
| A | `backend/app/services/analytics_metrics.py` |
| M | `backend/app/services/analytics_service.py` |
| M | `backend/tests/test_analytics.py` |

</details>

<a id="commit-32c5e97"></a>
### HIST-036 — `32c5e97` — perf(dashboard): agrega progresso e tarefas em uma consulta

**Autoria:** 2026-10-17T20:51:58-03:00 · **Diff:** [32c5e97](https://github.com/Vini-cods/EduTrack/commit/32c5e97f5ed49d5f458d6b2249ec23a0d4f09fba) · **Arquivos:** 2.

**Objetivo e entrega:** remover múltiplos COUNTs por status/disciplina (N+1) no resumo do Dashboard.

**Código e evolução:**

- Código: `get_dashboard_metrics` usa OUTER JOIN, GROUP BY, COUNT e SUM/CASE em uma consulta; filtra tanto dono da disciplina quanto dono da tarefa. Mantém disciplinas vazias e calcula totais/progressos a partir das linhas agregadas.

**Especificação resultante:** O resumo agregado do endpoint deve usar quantidade constante de consultas e preservar disciplinas vazias e isolamento do usuário.

**Validação e evidência:** Testes adicionados em `test_dashboard.py`: status agregados, disciplina sem tarefas, tarefa estrangeira inconsistente não vazando e contagem de SELECTs constante com 50 disciplinas extras. Limite: otimiza esse endpoint, não afirma que a página inteira usa só uma requisição.

**Limites e continuidade:** Testes adicionados em `test_dashboard.py`: status agregados, disciplina sem tarefas, tarefa estrangeira inconsistente não vazando e contagem de SELECTs constante com 50 disciplinas extras. Limite: otimiza esse endpoint, não afirma que a página inteira usa só uma requisição.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/app/services/dashboard_service.py` |
| M | `backend/tests/test_dashboard.py` |

</details>

<a id="commit-49ccfb8"></a>
### HIST-037 — `49ccfb8` — test(perf): reduz custo do bcrypt apenas na suíte isolada

**Autoria:** 2026-10-17T22:55:11-03:00 · **Diff:** [49ccfb8](https://github.com/Vini-cods/EduTrack/commit/49ccfb80cd199b90b67d8e653e7f53d034227771) · **Arquivos:** 1.

**Objetivo e entrega:** reduzir demora da suíte mantendo a semântica real de hash de senha.

**Código e evolução:**

- Código: fixture autouse/session `_fast_test_password_hashes` em `backend/tests/conftest.py`; guarda configuração de `pwd_context`, aplica bcrypt 4 rounds durante pytest e restaura no `finally/teardown`.

**Especificação resultante:** Contrato: backend real/configuração de produção não alterados; não substitui bcrypt por fake e preserva limites/comportamento. A rodada histórica em 66592bc registra suite 185/185 backend concluída. Não documentar como redução de segurança da aplicação.

**Validação e evidência:** 66592bc registra a suíte histórica de 185 testes backend aprovada após a fixture de custo reduzido; a aplicação mantém bcrypt de produção inalterado.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/tests/conftest.py` |

</details>

<a id="commit-e90f979"></a>
### HIST-038 — `e90f979` — feat(insights): apresenta consistência, padrões e relatórios CSV

**Autoria:** 2026-10-17T23:11:11-03:00 · **Diff:** [e90f979](https://github.com/Vini-cods/EduTrack/commit/e90f9796d78ce61ef25723f4275b96e6c1a8c8fd) · **Arquivos:** 9.

**Objetivo e entrega:** transformar os novos contratos analíticos em leitura e ações concretas na página Insights.

**Código e evolução:**

- Componentes novos: `PeriodComparison`, `PlanningDiagnostics`, `StudyConsistency`, `StudyPatterns`, `SubjectAnalytics`; `Insights.tsx` compõe-os e mantém alternativas tabulares/fallback para API sem campos novos. Tipos em `types/analytics.ts` espelham comparação/padrões/diagnóstico e ações.
- Código puro em `advancedAnalytics.ts`: `reportDateKey` usa fuso do relatório; `consistencyCalendar` alinha segunda/domingo e ordena sem mutação; `studyIntensity` classifica 0–4; `analyticsActionLinks` mapeia ações. `csvCell`, `csvRows`, `analyticsCsv` exportam daily/subjects/comparison com datas/fuso/unidades explícitos, UTF-8 BOM, ponto e vírgula, escaping e neutralização de prefixos de fórmula em textos controlados pelo usuário.
- CSV usa resposta já carregada no navegador, sem envio externo; comparação indisponível não inventa trecho; padrões não medem eficiência e relatório antigo não inventa histórico de conclusões. Testes novos `advancedAnalytics.test.mjs`; validação integrada e CSV baixado/conferido registrados em 66592bc.

**Especificação resultante:** Exibir comparações e padrões explicáveis; exportar somente dados carregados, com contexto de período/fuso e proteção de CSV.

**Validação e evidência:** 66592bc registra 185 testes backend, 84 frontend, build e QA isolado; um CSV foi baixado/conferido. Os recortes focados se sobrepõem à suíte.

<details><summary>Todos os 9 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `frontend/src/components/analytics/PeriodComparison.tsx` |
| A | `frontend/src/components/analytics/PlanningDiagnostics.tsx` |
| A | `frontend/src/components/analytics/StudyConsistency.tsx` |
| A | `frontend/src/components/analytics/StudyPatterns.tsx` |
| A | `frontend/src/components/analytics/SubjectAnalytics.tsx` |
| A | `frontend/src/lib/advancedAnalytics.ts` |
| M | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/types/analytics.ts` |
| A | `frontend/tests/advancedAnalytics.test.mjs` |

</details>

<a id="commit-ebd678e"></a>
### HIST-039 — `ebd678e` — feat(dashboard): orienta próximo passo e distribui prazos da semana

**Autoria:** 2026-10-17T23:13:20-03:00 · **Diff:** [ebd678e](https://github.com/Vini-cods/EduTrack/commit/ebd678e000dd51353d88915f683494ffd0972ee7) · **Arquivos:** 7.

**Objetivo e entrega:** responder “o que fazer agora” e distribuir os próximos prazos em vez de mostrar só totais.

**Código e evolução:**

- Código: `dashboardRecommendation` retorna união event/task/plan. Prioriza compromisso em andamento; depois o próximo em até 30 minutos; depois a ordenação existente de tarefas; sem tarefa, próximo compromisso ou convite ao planejamento. Motivos: atrasada, hoje, prioridade, próxima entrega, sem prazo. Desempate de eventos em andamento dá preferência a prova/aula; não altera dados automaticamente.
- UI: `DashboardNextAction`, `DashboardDeadlinePressure`; botões de tarefa levam ao Focus com contexto sem iniciar estudo; mapa de sete dias leva ao calendário escolhido. `useDashboard` coordena recarga com analytics; `PriorityTasks` e página são integrados sem duplicar regras. Testes novos `dashboardRecommendation.test.mjs` cobrem cenários e limites; validação integrada documentada em 66592bc.

**Especificação resultante:** Apresentar o próximo passo por regras explícitas e navegar para o contexto escolhido sem iniciar estudo nem alterar prioridade automaticamente.

**Validação e evidência:** 66592bc registra testes de recomendação e QA de próxima tarefa, mapa de prazos, preparação do Focus e temas em base temporária. Nenhuma nova execução foi feita para este documento.

<details><summary>Todos os 7 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `frontend/src/components/dashboard/DashboardDeadlinePressure.tsx` |
| A | `frontend/src/components/dashboard/DashboardNextAction.tsx` |
| M | `frontend/src/components/dashboard/PriorityTasks.tsx` |
| M | `frontend/src/hooks/useDashboard.ts` |
| A | `frontend/src/lib/dashboardRecommendation.ts` |
| M | `frontend/src/pages/Dashboard.tsx` |
| A | `frontend/tests/dashboardRecommendation.test.mjs` |

</details>

<a id="commit-d09b347"></a>
### HIST-040 — `d09b347` — style(auth): intensifica cores de partículas e conexões

**Autoria:** 2026-10-17T23:14:29-03:00 · **Diff:** [d09b347](https://github.com/Vini-cods/EduTrack/commit/d09b34798b6ec527e9bac796a0e1c692c172b0b5) · **Arquivos:** 2.

**Objetivo e entrega:** reforçar um pouco mais a vibração da rede sem aumentar densidade/custo.

**Código e evolução:**

- Código: Canvas/CSS passam a #c81e3e no claro e #ff6278 no escuro; máximo de alfa de linhas sobe 0,68→0,78, pontos permanecem 0,96 e espessura 1 px. Movimento, fps e observers preservados.

**Especificação resultante:** Intensificar as cores da rede nos dois temas preservando movimento, atenuação por distância e limites de custo.

**Validação e evidência:** Evidência histórica associada: type-check/build e revisão claro/escuro no registro consolidado 66592bc; sem regra acadêmica/API/migration.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/auth/AuthNetwork.css` |
| M | `frontend/src/components/auth/AuthNetwork.tsx` |

</details>

<a id="commit-66592bc"></a>
### HIST-041 — `66592bc` — docs: consolida guia definitivo e registra evolução de analytics

**Autoria:** 2026-10-17T23:18:23-03:00 · **Diff:** [66592bc](https://github.com/Vini-cods/EduTrack/commit/66592bcf305c5aad21d09100cedbee76f9b21aec) · **Arquivos:** 9.

**Objetivo e entrega:** reduzir documentação contraditória/redundante e registrar contratos/limites/QA de analytics e Dashboard.

**Código e evolução:**

- Arquivos: reescreve README principal, atualiza `docs/DEVELOPMENT_STATUS.md`; remove sete documentos da raiz, incluindo **um openspec.md anterior de 44 linhas**, `GUIA_DE_EXECUCAO_E_TESTES.md`, `LEIA-ME.md`, `api-documentation.md`, `crud-validation.md`, `data-dictionary.md`, `dicionario_de_dados.md`. O OpenSpec novo solicitado agora é reconstrução retrospectiva; não fingir que o arquivo antigo nunca existiu.

**Especificação resultante:** Consolidar instruções vigentes em README e manter evidências/limites no estado de desenvolvimento, removendo documentos redundantes.

**Validação e evidência:** Evidências registradas: 185/185 backend em 224,20 s, 20/20 recorte focado e 84/84 frontend; build TypeScript/Vite 2.672 módulos/~1m23s. QA SQLite temporário 8001/5174 para Dashboard/Insights claro/escuro, semanal/mensal, futuro indisponível, CSV de comparação baixado/conferido, 320/390 sem overflow, Focus com contexto e links do mapa, erro/retry desligando/religando API. Sem migration nova, sem SMTP externo e sem alterar preferência do SO. Essas são declarações documentadas naquela revisão, não novas execuções da auditoria.

**Limites e continuidade:** reduzir documentação contraditória/redundante e registrar contratos/limites/QA de analytics e Dashboard.

<details><summary>Todos os 9 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| D | `GUIA_DE_EXECUCAO_E_TESTES.md` |
| D | `LEIA-ME.md` |
| M | `README.md` |
| D | `api-documentation.md` |
| D | `crud-validation.md` |
| D | `data-dictionary.md` |
| D | `dicionario_de_dados.md` |
| M | `docs/DEVELOPMENT_STATUS.md` |
| D | `openspec.md` |

</details>

<a id="commit-124b408"></a>
### HIST-042 — `124b408` — fix(navigation): mantém Insights acessível e alinha controles de período

**Autoria:** 2026-10-18T00:46:49-03:00 · **Diff:** [124b408](https://github.com/Vini-cods/EduTrack/commit/124b408bf5ede907a42375981b8576bf0570dbab) · **Arquivos:** 4.

**Objetivo e entrega:** manter item Insights e navegação analítica acessíveis em alturas/larguras pequenas.

**Código e evolução:**

- Código: `DashboardLayout` troca h-screen por h-dvh e usa min-h-0 nos contêineres; `Sidebar` mantém cabeçalho/rodapé sem encolher e área própria rolável, alvos mínimos 44 px, foco visível, title no recolhido. `revealActiveLink` ajusta apenas scrollTop da área de links ao mudar rota/colapso e via ResizeObserver, sem mover a página ou roubar foco.
- `Tooltip` aceita className para ocupar largura no menu recolhido. `AnalyticsControls` agrupa setas/range em grid `44px minmax(0,1fr) 44px`, separa Hoje, preserva week/month e permite faixa de datas quebrar no mobile, com aria-live/group e ícones decorativos.
- Sem nova API/teste unitário para CSS; validação visual e build da rodada registradas em 1988377.

**Especificação resultante:** O item ativo da sidebar deve permanecer alcançável e os controles de período devem caber em telas pequenas com alvos acessíveis.

**Validação e evidência:** Sem execução nova de testes nesta auditoria; ver os testes e registros históricos associados à rodada.

<details><summary>Todos os 4 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/DashboardLayout.tsx` |
| M | `frontend/src/components/Sidebar.tsx` |
| M | `frontend/src/components/analytics/AnalyticsControls.tsx` |
| M | `frontend/src/components/ui/Tooltip.tsx` |

</details>

<a id="commit-539cc68"></a>
### HIST-043 — `539cc68` — fix(dashboard): equilibra cartões e reduz espaços vazios

**Autoria:** 2026-10-18T00:51:53-03:00 · **Diff:** [539cc68](https://github.com/Vini-cods/EduTrack/commit/539cc689dc647b75fad070dd04c816b188e38042) · **Arquivos:** 2.

**Objetivo e entrega:** reduzir lacunas geradas por painéis com alturas muito diferentes sem reposicionamento JavaScript.

**Código e evolução:**

- Código: sete painéis simples em CSS `columns-1 xl:columns-2` com `break-inside-avoid`/margem, ordem de DOM/teclado descendo uma coluna e depois a outra. Gráficos Recharts ficam fora para tamanho/leitura integral. Remove CTA redundante de Insights; mantém “Explorar Insights” nos gráficos. `PlanningDiagnostics` compacto usa duas colunas quando há espaço.

**Especificação resultante:** Trade-off: leitura é por coluna, não grade por linha. Sem mudança em regras/HTTP/dados. QA/backend não extrapolados; validação de layout documentada em 1988377.

**Validação e evidência:** Sem execução nova de testes nesta auditoria; ver os testes e registros históricos associados à rodada.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/analytics/PlanningDiagnostics.tsx` |
| M | `frontend/src/pages/Dashboard.tsx` |

</details>

<a id="commit-1988377"></a>
### HIST-044 — `1988377` — docs: registra ajustes de navegação e layout com validações

**Autoria:** 2026-10-18T00:54:48-03:00 · **Diff:** [1988377](https://github.com/Vini-cods/EduTrack/commit/19883771113a6e070a3c1dbe9b5b40466d4ec915) · **Arquivos:** 1.

**Objetivo e entrega:** somente `docs/DEVELOPMENT_STATUS.md`; registra os dois ajustes anteriores e seus limites.

**Código e evolução:**

- QA medido: Dashboard de baixa densidade em 1280×720 reduziu diferença entre finais das colunas de 200,75 para 21,25 px; Insights visível na sidebar expandida em 720 px; recolher e reduzir altura a 600 manteve ativo dentro da rolagem, alvo 51×44 px. Insights escuro em 320 px sem overflow: setas 44×44 alinhadas, datas em duas linhas e navegação mensal funcionando. Não houve homologação de agenda cheia nessa rodada; preservar esse limite no relato.

**Especificação resultante:** Registrar o layout, a ordem de navegação e as medidas efetivamente conferidas sem atribuir novas funções à documentação.

**Validação e evidência:** Evidências históricas: 84/84 testes frontend e `npm run build` com TypeScript/2.672 módulos e etapa Vite ~1m39s. Sem alteração de API/model/migration/banco/dependências; suíte backend não repetida nessa correção de UI.

**Limites e continuidade:** Arquivo: somente `docs/DEVELOPMENT_STATUS.md`; registra os dois ajustes anteriores e seus limites. QA medido: Dashboard de baixa densidade em 1280×720 reduziu diferença entre finais das colunas de 200,75 para 21,25 px; Insights visível na sidebar expandida em 720 px; recolher e reduzir altura a 600 manteve ativo dentro da rolagem, alvo 51×44 px. Insights escuro em 320 px sem overflow: setas 44×44 alinhadas, datas em duas linhas e navegação mensal funcionando. Não houve homologação de agenda cheia nessa rodada; preservar esse limite no relato.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |

</details>

<a id="commit-5396474"></a>
### HIST-045 — `5396474` — feat(search): pagina Notes e Materials com busca no servidor

**Autoria:** 2026-10-18T19:08:23-03:00 · **Diff:** [5396474](https://github.com/Vini-cods/EduTrack/commit/53964744b57a7467718ea88f6c1e3b42d8649ebe) · **Arquivos:** 18.

**Objetivo e entrega:** Evitar transferir todas as notas e materiais ao navegador e permitir busca útil no conteúdo e contexto acadêmico.

**Código e evolução:**

- backend/app/services/search.py introduz normalize_search, search_tokens, _sqlite_fold, search_fields, apply_text_search e search_rank: busca literal por tokens Unicode sem acentos e prioridade para correspondências no título. SQLite usa função determinística na conexão; SQL Server possui caminho por collation CI_AI e JSON_VALUE.
- GET /notes/page, GET /notes/search e GET /materials/page adicionam respostas com items, total, limit e offset. page_notes, search_notes, _filtered_notes e page_materials filtram pelo proprietário/contexto antes de paginar, com ordenação estável. Os contadores de status de Materials cobrem o escopo filtrado inteiro, não somente a página.
- O frontend adiciona Pagination, types/pagination.ts e métodos paginados nas APIs Notes/Materials; useNotes e páginas passam a carregar lotes. A Command Palette conserva snapshot de disciplinas/tarefas e busca Notes/Materials remotamente, com debounce de 250 ms, cancelamento, resultados limitados e falhas parciais.
- backend/tests/test_search_pagination.py e commandSearch.test.mjs cobrem limites, compatibilidade, acentos/tags/contexto, conteúdo pesquisável, resumo de resposta, curingas literais, filtros, edição refletida na busca e autenticação.

**Especificação resultante:** Listas usam 20 registros por padrão e limite de 50. Busca compacta de Notes retorna resumo de até 160 caracteres; Command Palette solicita até cinco resultados por tipo. Endpoints antigos de listagem permanecem compatíveis.

**Validação e evidência:** Testes de busca/paginação foram adicionados neste commit. A documentação consolidada em 82ff78f registra recortes focados de 26 e 10 testes, sobrepostos à suíte completa de 18/10 com 239 backend e 91 frontend; não são execuções novas desta auditoria.

**Limites e continuidade:** A busca substring ainda percorre registros do proprietário; não há índice full-text. O caminho de SQL Server no código não implica homologação desse banco.

<details><summary>Todos os 18 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/app/api/v1/endpoints/materials.py` |
| M | `backend/app/api/v1/endpoints/notes.py` |
| M | `backend/app/schemas/material.py` |
| M | `backend/app/schemas/note.py` |
| M | `backend/app/services/material_service.py` |
| M | `backend/app/services/note_service.py` |
| A | `backend/app/services/search.py` |
| A | `backend/tests/test_search_pagination.py` |
| A | `frontend/src/api/materials.ts` |
| M | `frontend/src/api/notes.ts` |
| M | `frontend/src/components/CommandPalette.tsx` |
| A | `frontend/src/components/ui/Pagination.tsx` |
| M | `frontend/src/hooks/useNotes.ts` |
| M | `frontend/src/lib/commandSearch.ts` |
| M | `frontend/src/pages/Materials.tsx` |
| M | `frontend/src/pages/Notes.tsx` |
| A | `frontend/src/types/pagination.ts` |
| M | `frontend/tests/commandSearch.test.mjs` |

</details>

<a id="commit-527dab7"></a>
### HIST-046 — `527dab7` — feat(analytics): registra conclusões e distribui intervalos ativos por dia

**Autoria:** 2026-10-18T19:12:11-03:00 · **Diff:** [527dab7](https://github.com/Vini-cods/EduTrack/commit/527dab7ed8f9dc9a3162fc22923010090b697182) · **Arquivos:** 22.

**Objetivo e entrega:** Distinguir fatos temporais reais do estado atual das tarefas e repartir estudo entre dias sem contabilizar pausas.

**Código e evolução:**

- A migration a18e20c4d200_activity_history.py, após f3a7bf247110, adiciona Task.completed_at e os modelos TaskStatusEvent e StudySegment, com índices por proprietário/tempo e unicidade do início de segmento por sessão.
- Task registra mudança de status atomicamente por atualização condicional. Repetir o mesmo status não gera conclusão extra; reabrir limpa completed_at e mantém eventos. Criar tarefa já concluída registra a conclusão, e excluir a tarefa remove o histórico correspondente.
- Em study_session_service.py, _transition substitui fechamento isolado de segmento: estado e intervalo ativo são gravados na mesma transação. Atualização condicional rejeita escritor desatualizado e evita dupla contabilização em pausa, retomada e finalização.
- activity_history.distribute_session normaliza UTC, reparte segmentos pela meia-noite do fuso IANA e preserva tempo conhecido. Resíduos legados ficam no início da sessão e aparecem em legacy_studied_minutes como aproximação. completion_events e reopened_events são separados das tarefas concluídas por prazo.
- Frontend adiciona CompletionHistory e atualiza StudyPatterns, Insights, tipos de analytics e advancedAnalytics. test_activity_history.py cobre idempotência, concorrência, exclusão, intervalos ativos, meia-noite/DST, legado e histórico; testes de migration e analytics frontend também mudam.

**Especificação resultante:** Somente segmentos ativos conhecidos são distribuídos entre dias; pausas não são interpoladas. Conclusões e reaberturas representam transições prospectivas reais, inclusive em tarefas sem prazo. Reabrir e concluir novamente gera novo evento.

**Validação e evidência:** O commit inclui testes novos de histórico e ajusta regressões de migration/analytics. A consolidação de 18/10 registra aprovação da suíte backend completa e ensaio de migrations/preservação em cópia e banco local; essa evidência é histórica, não uma execução desta auditoria.

**Limites e continuidade:** Datas antigas não são inferidas de updated_at. Os padrões por sessão continuam baseados no início local; sua contagem pode diferir da contagem de sessões cujo estudo intersecta o período.

<details><summary>Todos os 22 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `backend/alembic/versions/a18e20c4d200_activity_history.py` |
| M | `backend/app/api/v1/endpoints/tasks.py` |
| M | `backend/app/models/__init__.py` |
| A | `backend/app/models/activity_history.py` |
| M | `backend/app/models/study_session.py` |
| M | `backend/app/models/task.py` |
| M | `backend/app/schemas/analytics.py` |
| M | `backend/app/schemas/task.py` |
| A | `backend/app/services/activity_history.py` |
| M | `backend/app/services/analytics_metrics.py` |
| M | `backend/app/services/analytics_service.py` |
| M | `backend/app/services/study_session_service.py` |
| M | `backend/app/services/task_service.py` |
| A | `backend/tests/test_activity_history.py` |
| M | `backend/tests/test_study_session_migration.py` |
| A | `frontend/src/components/analytics/CompletionHistory.tsx` |
| M | `frontend/src/components/analytics/StudyPatterns.tsx` |
| M | `frontend/src/lib/advancedAnalytics.ts` |
| M | `frontend/src/pages/Insights.tsx` |
| M | `frontend/src/types/analytics.ts` |
| M | `frontend/src/types/index.ts` |
| M | `frontend/tests/advancedAnalytics.test.mjs` |

</details>

<a id="commit-ef66fd8"></a>
### HIST-047 — `ef66fd8` — feat(preferences): sincroniza tema capacidade e Pomodoro por conta

**Autoria:** 2026-10-18T19:13:36-03:00 · **Diff:** [ef66fd8](https://github.com/Vini-cods/EduTrack/commit/ef66fd8c04f378cde3fc422356411facac678ba4) · **Arquivos:** 24.

**Objetivo e entrega:** Persistir tema, capacidade diária e configuração Pomodoro por usuário, preservando preferências já salvas ao hidratar a interface.

**Código e evolução:**

- A migration b18e20c4d201 cria user_preferences com PK/FK do usuário e constraints para tema, capacidade e durações/ciclos. GET/PATCH /api/v1/preferences/ expõem schemas de resposta e atualização parcial.
- read_preferences retorna defaults sem criar registro. update_preferences altera somente campos enviados, trata disputa na primeira gravação e preserva os demais campos; PATCH de tema não substitui capacidade ou Pomodoro.
- UserPreferencesProvider e PreferencesSync implementam cache por proprietário, fila de PATCH serializada, merge parcial de Pomodoro, retry, cancelamento/dispose e descarte de respostas antigas. PreferencesSyncStatus expõe estados de carregamento, gravação e erro. Academic Load, Focus e Settings adotam o contexto.
- AuthContext valida /auth/me com cancelamento. O interceptador Axios preserva Authorization explicitamente fornecido para evitar que operações enfileiradas utilizem credenciais de outra conta.
- test_user_preferences.py, test_user_preferences_migration.py e userPreferences.test.mjs cobrem leitura sem escrita, PATCH parcial, isolamento, validações/bordas, fila concorrente, retry, logout e cache.

**Especificação resultante:** As operações são isoladas pelo proprietário. A leitura inicial não grava defaults sobre o perfil. Configurações de Pomodoro são atualizadas parcialmente; o estado executivo do timer continua local.

**Validação e evidência:** Os testes descritos fazem parte do commit. A consolidação de 18/10 registra recortes de preferências com 20 e 25 testes e suíte completa de 239 backend/91 frontend; os recortes se sobrepõem e não devem ser somados.

**Limites e continuidade:** Neste commit, o tema remoto prevalecia após autenticação; a regra é deliberadamente substituída em 64e4948 pela escolha feita no acesso. Não há sincronização de preferências em tempo real entre dispositivos.

<details><summary>Todos os 24 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `backend/alembic/versions/b18e20c4d201_user_preferences.py` |
| A | `backend/app/api/v1/endpoints/user_preferences.py` |
| M | `backend/app/api/v1/router.py` |
| M | `backend/app/models/__init__.py` |
| A | `backend/app/models/user_preferences.py` |
| A | `backend/app/schemas/user_preferences.py` |
| A | `backend/app/services/user_preferences_service.py` |
| A | `backend/tests/test_user_preferences.py` |
| A | `backend/tests/test_user_preferences_migration.py` |
| M | `frontend/src/App.tsx` |
| M | `frontend/src/api/client.ts` |
| A | `frontend/src/components/PreferencesSyncStatus.tsx` |
| M | `frontend/src/components/ThemeToggle.tsx` |
| M | `frontend/src/contexts/AuthContext.tsx` |
| M | `frontend/src/contexts/ThemeContext.tsx` |
| A | `frontend/src/contexts/UserPreferencesContext.tsx` |
| M | `frontend/src/hooks/useAcademicCapacity.ts` |
| M | `frontend/src/lib/pomodoro.ts` |
| A | `frontend/src/lib/userPreferences.ts` |
| M | `frontend/src/main.tsx` |
| M | `frontend/src/pages/AcademicLoad.tsx` |
| M | `frontend/src/pages/FocusMode.tsx` |
| M | `frontend/src/pages/Settings.tsx` |
| A | `frontend/tests/userPreferences.test.mjs` |

</details>

<a id="commit-7773573"></a>
### HIST-048 — `7773573` — feat(recovery): persiste entregas e prepara operação em produção

**Autoria:** 2026-10-18T19:21:40-03:00 · **Diff:** [7773573](https://github.com/Vini-cods/EduTrack/commit/777357318ddfc08f814dad89437934d6da978643) · **Arquivos:** 21.

**Objetivo e entrega:** Tornar a entrega da recuperação de senha recuperável e preparar operação de produção sem publicar infraestrutura.

**Código e evolução:**

- A migration c18e20c4d202 adiciona RecoveryDelivery, RecoveryRateEvent e RecoveryRateLock, semeando a linha técnica usada para serializar decisões de limite.
- prepare_password_reset verifica configuração SMTP, aplica limite compartilhado e persiste a intenção de entrega de conta ativa existente antes do 202. Contas inexistentes/inativas mantêm resposta genérica sem outbox de envio. O token de reset não é armazenado na outbox: o worker o gera ao entregar e o vincula à versão da senha.
- deliver_one faz claim com UPDATE condicional e lease, encerra transação antes do SMTP, valida expiração/conta/versão da senha e aplica retry exponencial limitado. Os estados são pending, sending, sent, failed e discarded. queue_status e prune_finished dão suporte operacional.
- app.workers.email_worker permite --once, --status, polling e limpeza periódica, com tratamento genérico de indisponibilidade. RecoveryRateLimiter.check serializa a decisão entre e-mail/IP no banco, usa buckets HMAC e calcula Retry-After, substituindo limitação restrita à memória de um processo.
- Configuração de produção valida segredo, origem HTTPS, CORS/hosts explícitos, TLS SMTP e certificado de SQL Server. A aplicação adiciona health/live, health/ready, correlação e logs genéricos, headers de segurança e desativa Swagger/OpenAPI públicos em produção.
- Exemplos de Caddy, serviços API/worker e logging são adicionados, com opções documentadas em .env.example. Testes exercitam SMTP real em loopback, retry, descarte, lease abandonado, claim concorrente, rate limit compartilhado, health/schema, configurações e migration.

**Especificação resultante:** Para conta ativa existente, persistir a intenção de entrega antes do 202; contas inexistentes/inativas recebem resposta genérica sem criar entrega. O worker gera o token ao entregar, faz claim por lease e retry limitado. Limites são compartilhados entre processos; preparação de produção não equivale a publicação.

**Validação e evidência:** test_recovery_operations.py, test_recovery_migration.py e ajustes de test_password_reset.py compõem a evidência versionada. A documentação consolidada registra 19 testes SMTP/operação, 31 de recuperação, 48 focados de operação e suíte completa aprovada; SMTP foi exercitado somente em loopback.

**Limites e continuidade:** Entrega é pelo menos uma vez: queda após aceitação SMTP pode gerar nova tentativa. Aceitação SMTP não comprova chegada à caixa postal. Provedor externo, domínio, TLS público, worker em host real e deploy não foram homologados/publicados por este commit.

<details><summary>Todos os 21 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `backend/.env.example` |
| A | `backend/alembic/versions/c18e20c4d202_recovery_outbox_and_limits.py` |
| M | `backend/app/api/v1/endpoints/auth.py` |
| M | `backend/app/core/config.py` |
| M | `backend/app/db/session.py` |
| M | `backend/app/main.py` |
| M | `backend/app/models/__init__.py` |
| A | `backend/app/models/recovery_delivery.py` |
| M | `backend/app/services/email_service.py` |
| M | `backend/app/services/password_reset_service.py` |
| A | `backend/app/services/recovery_delivery_service.py` |
| A | `backend/app/services/recovery_rate_limit.py` |
| A | `backend/app/workers/__init__.py` |
| A | `backend/app/workers/email_worker.py` |
| A | `backend/deploy/Caddyfile.example` |
| A | `backend/deploy/edutrack-api.service.example` |
| A | `backend/deploy/edutrack-mail.service.example` |
| A | `backend/deploy/logging.json` |
| M | `backend/tests/test_password_reset.py` |
| A | `backend/tests/test_recovery_migration.py` |
| A | `backend/tests/test_recovery_operations.py` |

</details>

<a id="commit-4db98ce"></a>
### HIST-049 — `4db98ce` — feat(backup): adiciona snapshots SQLite e restauração verificada

**Autoria:** 2026-10-18T19:29:04-03:00 · **Diff:** [4db98ce](https://github.com/Vini-cods/EduTrack/commit/4db98cee58edefc17cd0098c05b5b2fdae6f39cb) · **Arquivos:** 3.

**Objetivo e entrega:** Permitir backup SQLite consistente e verificável e restauração sem sobrescrever banco existente.

**Código e evolução:**

- backend/scripts/sqlite_backup.py implementa _connect_readonly, _sha256, _manifest_path, inspect_snapshot, verify_snapshot, backup_database, restore_database e main.
- A origem é aberta como read-only e copiada pela API online de backup SQLite. Destino e manifesto são reservados exclusivamente; integrity_check valida a cópia. O manifesto registra SHA-256, tabelas/contagens e revisões Alembic.
- A ferramenta recusa adulteração, destino existente ou origem igual ao destino. A restauração exige arquivo novo e compara tabelas/revisões com o snapshot verificado.
- test_sqlite_backup.py cobre origem com WAL, restauração preservando valores e original, recusa de sobrescrita, adulteração e ausência de origem.

**Especificação resultante:** CLI com operações backup, verify e restore. Não restaura sobre banco em uso e não sobrescreve arquivos existentes. Falhas removem somente o destino novo reservado pela própria operação.

**Validação e evidência:** Três testes de backup integram a suíte histórica de 18/10 registrada em 82ff78f. O arquivo de testes verifica conteúdo preservado e integridade sem tocar no banco real.

**Limites e continuidade:** O CLI não configura agendamento, retenção ou cópia externa. Verificar integridade não substitui ensaiar recuperação completa no host de produção escolhido.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| A | `backend/scripts/__init__.py` |
| A | `backend/scripts/sqlite_backup.py` |
| A | `backend/tests/test_sqlite_backup.py` |

</details>

<a id="commit-82ff78f"></a>
### HIST-050 — `82ff78f` — docs: consolida entrega validações e operação do EduTrack

**Autoria:** 2026-10-18T19:54:53-03:00 · **Diff:** [82ff78f](https://github.com/Vini-cods/EduTrack/commit/82ff78ff700a88d70518e4c8a2ab9beca8ae9dd7) · **Arquivos:** 3.

**Objetivo e entrega:** Consolidar a entrega de histórico, preferências, busca paginada e preparação operacional, registrando validações e limites reais.

**Código e evolução:**

- README.md, docs/DEVELOPMENT_STATUS.md e docs/PASSWORD_RECOVERY.md documentam os recursos implementados, comandos de worker/health/configuração, recuperação, backup/restauração e preservação das migrations.
- A documentação distingue preparação de produção de publicação real e registra que testes, leituras HTTP e migrations não substituem QA visual completo.

**Especificação resultante:** Commit documental; não adiciona funcionalidade executável nem aplica por si uma migration ao banco do usuário.

**Validação e evidência:** Registra 239/239 testes backend, 91/91 frontend e build TypeScript/Vite aprovados na rodada de 18/10. Recortes focados são sobrepostos. Registra ensaio de migrations aditivas em cópia e banco local com backup, preservação semântica e verificações de integridade/FK.

**Limites e continuidade:** QA visual completo das novidades de 18/10 não foi concluído naquela rodada por indisponibilidade do navegador. SMTP foi validado somente em loopback; não houve publicação de infraestrutura.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `README.md` |
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `docs/PASSWORD_RECOVERY.md` |

</details>

<a id="commit-03b478f"></a>
### HIST-051 — `03b478f` — feat(brand): add light and dark entry videos

**Autoria:** 2026-10-19T00:06:27-03:00 · **Diff:** [03b478f](https://github.com/Vini-cods/EduTrack/commit/03b478f33ce3042b93d00c62addc00979e272eab) · **Arquivos:** 5.

**Objetivo e entrega:** Preparar o vídeo fornecido pelo usuário para a entrada do produto nos temas claro e escuro.

**Código e evolução:**

- Adiciona edutrack-entry-light.mp4, edutrack-entry-dark.mp4 e os respectivos posters JPEG em frontend/src/assets/intro/.
- A procedência em assets/brand/README.md descreve conversão temporária com FFmpeg, sem dependência adicional de runtime. A versão clara preserva cores; a escura adapta luminância para navy #10141b e crimson claro #f29ba2.

**Especificação resultante:** Vídeos de aproximadamente 10 segundos, 1280 × 720, 24 fps, H.264/yuv420p e fast start, preservando a trilha AAC original. Tamanhos aproximados: 816 kB claro, 677 kB escuro e posters de 38 kB por tema.

**Validação e evidência:** A documentação posterior registra inspeção de quadros/posters e confirmação de moov anterior a mdat nos arquivos MP4.

**Limites e continuidade:** O arquivo original do usuário não é alterado. Este commit adiciona assets, mas ainda não o gate de reprodução/navegação, introduzido no commit seguinte.

<details><summary>Todos os 5 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/assets/brand/README.md` |
| A | `frontend/src/assets/intro/edutrack-entry-dark-poster.jpg` |
| A | `frontend/src/assets/intro/edutrack-entry-dark.mp4` |
| A | `frontend/src/assets/intro/edutrack-entry-light-poster.jpg` |
| A | `frontend/src/assets/intro/edutrack-entry-light.mp4` |

</details>

<a id="commit-2ceb44c"></a>
### HIST-052 — `2ceb44c` — feat(auth): play themed intro after login and registration

**Autoria:** 2026-10-19T00:12:43-03:00 · **Diff:** [2ceb44c](https://github.com/Vini-cods/EduTrack/commit/2ceb44cd159dfa6355937281891828ff3c3ba44b) · **Arquivos:** 7.
**Gravação no Git:** 2026-10-19T00:13:04-03:00.

**Objetivo e entrega:** Reproduzir a apresentação depois de login ou cadastro válido e antes de montar o Dashboard.

**Código e evolução:**

- PrivateRoute exige token e usuário confirmado e devolve AuthSuccessIntro enquanto há uma entrada pendente, compartilhando o fluxo entre login e cadastro.
- authEntryReducer, sequence, pendingId e completeEntryIntro controlam pendência transitória. Logout e erro a limpam; ID crescente impede callback antigo de liberar outra autenticação, inclusive quando o JWT se repete. Refresh não cria nova apresentação.
- A primeira versão de AuthSuccessIntro aguarda preferências, congela a variante e oferece autoplay muted/playsInline, poster, ativar som, reprodução manual em bloqueio, Pular/Escape e alternativa estática com Continuar para movimento reduzido.
- Watchdogs limitam carregamento contínuo, reprodução por duração com margem e tempo absoluto. A hidratação das preferências é vinculada a proprietário, token e sessionId para não reutilizar prematuramente o tema de sessão anterior.
- authEntry.test.mjs adiciona três testes de geração da entrada, callbacks tardios/logout e limites de duração.

**Especificação resultante:** A apresentação é uma etapa transitória da autenticação; o Dashboard permanece desmontado durante sua execução. Eventos antigos só concluem a entrada de ID correspondente.

**Validação e evidência:** Testes adicionados no commit são posteriormente registrados em b529bf4 como parte de 94/94 frontend e build/type-check aprovados, com QA dos fluxos de entrada.

**Limites e continuidade:** Os controles e o layout desta primeira versão são substituídos em 44eaddc. A autoridade do tema remoto é substituída em 64e4948 pela escolha feita na tela de acesso.

<details><summary>Todos os 7 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/PrivateRoute.tsx` |
| A | `frontend/src/components/auth/AuthSuccessIntro.css` |
| A | `frontend/src/components/auth/AuthSuccessIntro.tsx` |
| M | `frontend/src/contexts/AuthContext.tsx` |
| M | `frontend/src/contexts/UserPreferencesContext.tsx` |
| A | `frontend/src/lib/authEntry.ts` |
| A | `frontend/tests/authEntry.test.mjs` |

</details>

<a id="commit-b529bf4"></a>
### HIST-053 — `b529bf4` — docs: record entry intro behavior and validation

**Autoria:** 2026-10-19T00:13:50-03:00 · **Diff:** [b529bf4](https://github.com/Vini-cods/EduTrack/commit/b529bf464880d46e5f43d3605092bd5be72017d0) · **Arquivos:** 1.

**Objetivo e entrega:** Registrar comportamento, decisões e validação da primeira versão da introdução pós-autenticação.

**Código e evolução:**

- Atualiza docs/DEVELOPMENT_STATUS.md com o gate compartilhado, isolamento de entradas, variantes de mídia, controles, movimento reduzido e limites de segurança.
- Documenta QA real de login escuro, término automático e refresh sem repetição; em banco temporário, variante clara, som/Escape, cadastro/Pular e mudança remota de tema entre sessões.

**Especificação resultante:** Commit documental da primeira iteração; os controles descritos pertencem ao histórico e não à interface atual.

**Validação e evidência:** Registra type-check, 94/94 testes frontend e build Vite aprovados, inspeção de mídia e conferência em 390 px com controles de 44 px.

**Limites e continuidade:** Autoplay rejeitado, stall/erro de mídia e prefers-reduced-motion foram revisados no código, sem serem forçados no navegador naquela rodada.

<details><summary>Todos os 1 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |

</details>

<a id="commit-44eaddc"></a>
### HIST-054 — `44eaddc` — refactor(auth): show themed entry video fullscreen without controls

**Autoria:** 2026-10-19T00:19:42-03:00 · **Diff:** [44eaddc](https://github.com/Vini-cods/EduTrack/commit/44eaddcb0e8ffcdba4810d3b74f3e82a69653513) · **Arquivos:** 2.

**Objetivo e entrega:** Exibir uma apresentação imersiva em tela cheia, removendo textos e botões sobrepostos conforme solicitação do usuário.

**Código e evolução:**

- AuthSuccessIntro remove footer, status visível, reprodução manual, controles de som e Pular. main recebe foco e aria-label; Escape permanece funcionando.
- Rejeição de play() e erro de mídia liberam o Dashboard automaticamente. Movimento reduzido evita vídeo e segue automaticamente, sem exigir botão invisível. Os watchdogs permanecem.
- CSS passa a position: fixed, inset: 0, height: 100dvh e overflow: hidden. O vídeo ocupa 100% com object-fit: cover e object-position: center.

**Especificação resultante:** Autoplay sem som, sem controles visíveis, com entrada automática no Dashboard ao terminar ou em caso de falha.

**Validação e evidência:** A documentação a032702 registra npm run build e 10/10 testes focados aprovados, além das duas variantes em 1280 × 720, zero botões, controls=false e término automático.

**Limites e continuidade:** object-fit: cover recorta a composição original 16:9 em viewports de outra proporção, especialmente verticais. A precedência do tema ainda é alterada depois, em 64e4948.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/auth/AuthSuccessIntro.css` |
| M | `frontend/src/components/auth/AuthSuccessIntro.tsx` |

</details>

<a id="commit-a032702"></a>
### HIST-055 — `a032702` — docs: update fullscreen intro behavior and checks

**Autoria:** 2026-10-19T00:20:14-03:00 · **Diff:** [a032702](https://github.com/Vini-cods/EduTrack/commit/a032702fd8d3eff1b5e849641f55866aa870fe4c) · **Arquivos:** 2.

**Objetivo e entrega:** Atualizar documentação da introdução para refletir tela cheia sem controles e sua validação.

**Código e evolução:**

- Atualiza docs/DEVELOPMENT_STATUS.md e frontend/src/assets/brand/README.md, removendo descrições de controles visíveis como comportamento atual.
- Explica fallback automático, respeito a movimento reduzido, cobertura do viewport e recorte proporcional das bordas.

**Especificação resultante:** Commit documental; consolida a apresentação em tela cheia implementada em 44eaddc.

**Validação e evidência:** Registra npm run build aprovado e 10/10 testes focados. No navegador, ambas as variantes mediram 1280 × 720 no viewport correspondente, sem botões e com controls=false, abrindo Dashboard automaticamente.

**Limites e continuidade:** A comprovação desta iteração ainda tratava o tema da conta como autoridade. A regra de prevalência do acesso é corrigida no commit seguinte.

<details><summary>Todos os 2 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/src/assets/brand/README.md` |

</details>

<a id="commit-64e4948"></a>
### HIST-056 — `64e4948` — fix(theme): preserve access theme through intro and dashboard

**Autoria:** 2026-10-19T00:36:58-03:00 · **Diff:** [64e4948](https://github.com/Vini-cods/EduTrack/commit/64e4948c707261be175fc189a29774782a91d69f) · **Arquivos:** 13.

**Objetivo e entrega:** Impedir que o tema antigo do perfil substitua a escolha feita no login/cadastro, mantendo a mesma cor no vídeo e no Dashboard.

**Código e evolução:**

- Login e Register passam useTheme().preference para AuthContext.login/register. authEntryReducer guarda o tema da entrada, preserva-o ao concluir o vídeo e limpa em logout/401.
- UserPreferencesProvider aplica o tema capturado no primeiro render autenticado. AuthSuccessIntro congela resolvedTheme imediatamente e deixa de esperar o GET das preferências para começar.
- readEntryTheme, rememberEntryTheme e clearEntryTheme cobrem reload entre receber token e /auth/me, com registro provisório contendo somente a cor. Após confirmar identidade, readPendingTheme, rememberPendingTheme e confirmPendingTheme isolam a intenção por proprietário até confirmação remota.
- PreferencesSync recebe tema de entrada opcional, lê o perfil real e envia somente {theme} quando difere. Erros GET/PATCH mantêm a aparência escolhida; retry conserva a intenção; dispose impede respostas antigas de produzir escrita tardia.
- Alterações autenticadas posteriores substituem a intenção anterior. Confirmações e tratamento de quota parcial limpam provisório obsoleto; ThemeProvider atualiza também a preferência do navegador quando a mudança é feita dentro do sistema. Settings explica a continuidade entre acesso, vídeo e sistema.
- Testes do reducer são ampliados; theme.test.mjs e userPreferences.test.mjs cobrem claro/escuro contra remoto oposto, preservação de capacidade/Pomodoro, PATCH desnecessário, GET/PATCH offline/retry, reload, armazenamento parcial/bloqueado, logout/ack tardio e alteração posterior.

**Especificação resultante:** A escolha no acesso prevalece sobre o tema salvo anteriormente. Sem intenção pendente, restaurar sessão usa o perfil normalmente. Somente o tema é transferido; capacidade e Pomodoro não recebem defaults do navegador. A cor do clipe permanece fixa durante a reprodução.

**Validação e evidência:** A documentação 0776ce2 registra 30/30 testes focados e build TypeScript/Vite aprovados, mais QA de acesso escuro contra perfil claro e inverso, reload sem replay e alternância autenticada posterior.

**Limites e continuidade:** Armazenamento totalmente bloqueado limita persistência local. Não há atualização em tempo real entre dispositivos. Não altera API, models, migrations nem os assets de mídia.

<details><summary>Todos os 13 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `frontend/src/components/auth/AuthSuccessIntro.tsx` |
| M | `frontend/src/contexts/AuthContext.tsx` |
| M | `frontend/src/contexts/ThemeContext.tsx` |
| M | `frontend/src/contexts/UserPreferencesContext.tsx` |
| M | `frontend/src/lib/authEntry.ts` |
| M | `frontend/src/lib/theme.ts` |
| M | `frontend/src/lib/userPreferences.ts` |
| M | `frontend/src/pages/Login.tsx` |
| M | `frontend/src/pages/Register.tsx` |
| M | `frontend/src/pages/Settings.tsx` |
| M | `frontend/tests/authEntry.test.mjs` |
| M | `frontend/tests/theme.test.mjs` |
| M | `frontend/tests/userPreferences.test.mjs` |

</details>

<a id="commit-0776ce2"></a>
### HIST-057 — `0776ce2` — docs: clarify access theme precedence and regression checks

**Autoria:** 2026-10-19T00:37:16-03:00 · **Diff:** [0776ce2](https://github.com/Vini-cods/EduTrack/commit/0776ce2d84830564d1fee29e5c760ee175657049) · **Arquivos:** 3.

**Objetivo e entrega:** Consolidar a regra de precedência do tema escolhido no acesso e registrar as regressões verificadas.

**Código e evolução:**

- Atualiza README.md, docs/DEVELOPMENT_STATUS.md e procedência da marca para descrever escolha no login/cadastro, mesma cor no vídeo e no Dashboard e sincronização parcial com a conta.
- Documenta bootstrap, intenções provisórias/por proprietário, retry, limpeza e persistência limitada quando o armazenamento está completamente bloqueado.

**Especificação resultante:** Login/cadastro claro → vídeo claro → Dashboard claro; login/cadastro escuro → vídeo escuro → Dashboard escuro. Alterações posteriores do tema continuam possíveis e não substituem capacidade ou Pomodoro.

**Validação e evidência:** Registra 30/30 testes focados, npm run build aprovado e QA dos dois sentidos com perfil de cor anterior oposta, recarregamento sem novo vídeo e alternância posterior funcionando.

**Limites e continuidade:** Cenários adversos de rede/storage foram exercitados nos testes de lógica, sem injeção no navegador. A suíte backend não foi repetida por ser alteração frontend. Este registro é histórico, não nova homologação em 24/10.

<details><summary>Todos os 3 arquivos deste commit</summary>

| Ação | Arquivo |
|---|---|
| M | `README.md` |
| M | `docs/DEVELOPMENT_STATUS.md` |
| M | `frontend/src/assets/brand/README.md` |

</details>

<a id="catalogo"></a>
## 6. Catálogo do código e arquivos atuais

Inventário integral dos **307 arquivos versionados** no corte: 271 arquivos de código/template/estilo e 36 arquivos complementares. As fontes estão fixadas no SHA do corte. “Origem” e “última alteração” seguem a história simplificada de cada caminho em HEAD (`git log --follow --topo-order`), evitando atribuir ao merge uma alteração já criada em outra linha. Símbolos listam definições de topo e métodos Python extraídos estaticamente; imports/reexports e closures não são uma nova implementação independente. Arquivos de teste descrevem cenários declarados, não uma execução em 24/10.

### Backend — cadeia de migrations e suporte

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/alembic/env.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/env.py) | Integra settings/metadata ao contexto online/offline de migrations. | `run_migrations_offline`, `run_migrations_online` | [`18c7bdd`](#commit-18c7bdd) → [`a740351`](#commit-a740351) |
| [backend/alembic/script.py.mako](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/script.py.mako) | Template de novas revisões Alembic; não equivale a migration aplicada. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/alembic/versions/079be52cae26_register_legacy_academic_core.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/079be52cae26_register_legacy_academic_core.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`879c43b`](#commit-879c43b) |
| [backend/alembic/versions/1b7cae50f901_create_academic_baseline.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/1b7cae50f901_create_academic_baseline.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/alembic/versions/64de913a920e_add_task_priority_estimated_hours_and_.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/64de913a920e_add_task_priority_estimated_hours_and_.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/alembic/versions/920618c3f9a9_add_study_sessions_table.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/920618c3f9a9_add_study_sessions_table.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/alembic/versions/96fdd9a96d98_add_calendar_events_table.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/96fdd9a96d98_add_calendar_events_table.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`1f8ef7c`](#commit-1f8ef7c) → [`879c43b`](#commit-879c43b) |
| [backend/alembic/versions/a18e20c4d200_activity_history.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/a18e20c4d200_activity_history.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`527dab7`](#commit-527dab7) |
| [backend/alembic/versions/b18e20c4d201_user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/b18e20c4d201_user_preferences.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`ef66fd8`](#commit-ef66fd8) |
| [backend/alembic/versions/c18e20c4d202_recovery_outbox_and_limits.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/c18e20c4d202_recovery_outbox_and_limits.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`7773573`](#commit-7773573) |
| [backend/alembic/versions/c218e785d190_enforce_one_active_study_session.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/c218e785d190_enforce_one_active_study_session.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/alembic/versions/d7a42be19c30_add_notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/d7a42be19c30_add_notes.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/alembic/versions/e6f38a91d420_unique_scheduled_classes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/e6f38a91d420_unique_scheduled_classes.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`c10cfcb`](#commit-c10cfcb) |
| [backend/alembic/versions/ebf926553436_add_materials_table.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/ebf926553436_add_materials_table.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/alembic/versions/f3a7bf247110_academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/f3a7bf247110_academic_records.py) | Revisão de schema com upgrade/downgrade; sua posição e efeito estão na cadeia de migrations abaixo. | `upgrade`, `downgrade` | [`a740351`](#commit-a740351) |

### Entradas e configuração executável

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/app/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/edutrack_ssms.sql](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/edutrack_ssms.sql) | Referência T-SQL histórica do core; não substitui o schema Alembic atual nem homologa MSSQL. | Sem definição de topo autônoma; composição, estilo ou template. | [`dfc742b`](#commit-dfc742b) |
| [frontend/index.html](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/index.html) | Documento de entrada do Vite, favicon e carregamento antecipado do tema. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/public/theme-init.js](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/public/theme-init.js) | Aplica o tema armazenado/sistema antes da renderização React para reduzir flash de cor. | Sem definição de topo autônoma; composição, estilo ou template. | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/App.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/App.tsx) | Composição dos providers, rotas públicas/protegidas e carregamento lazy das páginas internas. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/index.css](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/index.css) | Tokens de design, temas, tipografia, utilitários de layout e ajustes de movimento/acessibilidade. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`de95b44`](#commit-de95b44) |
| [frontend/src/main.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/main.tsx) | Ponto de montagem React no elemento raiz e importação do CSS global. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/vite.config.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/vite.config.ts) | Configuração do build/dev Vite e plugins da stack existente. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |

### Backend — API, rotas e dependências

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/app/api/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/api/deps.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/deps.py) | Sessão de banco da requisição e usuário autenticado/ativo. | `get_db`, `get_current_user` | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/api/v1/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/api/v1/endpoints/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/api/v1/endpoints/academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/academic_records.py) | Handlers HTTP do domínio academic records; aplica dependências, schemas e serviços listados nesta especificação. | `owned_subject`, `read_syllabus`, `update_syllabus`, `read_assessments`, `create_assessment`, `find_assessment`, `update_assessment`, `delete_assessment` | [`a740351`](#commit-a740351) |
| [backend/app/api/v1/endpoints/analytics.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/analytics.py) | Handlers HTTP do domínio analytics; aplica dependências, schemas e serviços listados nesta especificação. | `read_analytics` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/app/api/v1/endpoints/auth.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/auth.py) | Handlers HTTP do domínio auth; aplica dependências, schemas e serviços listados nesta especificação. | `register`, `login`, `read_user_me`, `forgot_password`, `reset_password` | [`18c7bdd`](#commit-18c7bdd) → [`7773573`](#commit-7773573) |
| [backend/app/api/v1/endpoints/calendar_events.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/calendar_events.py) | Handlers HTTP do domínio calendar events; aplica dependências, schemas e serviços listados nesta especificação. | `read_calendar_events`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event_series`, `delete_calendar_event` | [`eaa8194`](#commit-eaa8194) → [`c10cfcb`](#commit-c10cfcb) |
| [backend/app/api/v1/endpoints/dashboard.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/dashboard.py) | Handlers HTTP do domínio dashboard; aplica dependências, schemas e serviços listados nesta especificação. | `read_dashboard_metrics` | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) | Handlers HTTP do domínio materials; aplica dependências, schemas e serviços listados nesta especificação. | `read_materials_page`, `read_materials`, `read_materials_by_subject`, `create_material`, `update_material`, `update_material_status`, `delete_material` | [`eaa8194`](#commit-eaa8194) → [`5396474`](#commit-5396474) |
| [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) | Handlers HTTP do domínio notes; aplica dependências, schemas e serviços listados nesta especificação. | `read_notes_page`, `search_notes`, `read_notes`, `read_note`, `create_note`, `update_note`, `delete_note` | [`1f8ef7c`](#commit-1f8ef7c) → [`5396474`](#commit-5396474) |
| [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) | Handlers HTTP do domínio study sessions; aplica dependências, schemas e serviços listados nesta especificação. | `read_active_session`, `read_session_history`, `start_session`, `pause_session`, `resume_session`, `stop_session`, `delete_session` | [`eaa8194`](#commit-eaa8194) → [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/app/api/v1/endpoints/subjects.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/subjects.py) | Handlers HTTP do domínio subjects; aplica dependências, schemas e serviços listados nesta especificação. | `read_subjects`, `create_subject`, `read_subject`, `update_subject`, `delete_subject` | [`18c7bdd`](#commit-18c7bdd) → [`c10cfcb`](#commit-c10cfcb) |
| [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) | Handlers HTTP do domínio tasks; aplica dependências, schemas e serviços listados nesta especificação. | `read_tasks`, `read_tasks_by_subject`, `create_task`, `read_task`, `update_task`, `update_task_status`, `delete_task` | [`18c7bdd`](#commit-18c7bdd) → [`527dab7`](#commit-527dab7) |
| [backend/app/api/v1/endpoints/user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/user_preferences.py) | Handlers HTTP do domínio user preferences; aplica dependências, schemas e serviços listados nesta especificação. | `get_preferences`, `patch_preferences` | [`ef66fd8`](#commit-ef66fd8) |
| [backend/app/api/v1/router.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/router.py) | Monta os grupos de endpoints sob /api/v1. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`ef66fd8`](#commit-ef66fd8) |

### Backend — aplicação, segurança e persistência

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/app/core/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/core/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/core/config.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/core/config.py) | Settings de banco, autenticação, SMTP/operação e validações fail-fast de produção. | `Settings [validate_frontend_origin, validate_email_transport, validate_production, DATABASE_URL]` | [`18c7bdd`](#commit-18c7bdd) → [`7773573`](#commit-7773573) |
| [backend/app/core/security.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/core/security.py) | Hash/verificação de senha, JWT de acesso e tokens de redefinição com finalidade/versão. | `verify_password`, `get_password_hash`, `create_access_token`, `password_fingerprint`, `PasswordResetClaims`, `create_password_reset_token`, `verify_password_reset_token` | [`18c7bdd`](#commit-18c7bdd) → [`a740351`](#commit-a740351) |
| [backend/app/db/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/db/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/db/base.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/db/base.py) | Base declarativa e registro da metadata usada por models/Alembic. | `Base` | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/db/session.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/db/session.py) | Engine/session factory e particularidades de conexão SQLite/MSSQL. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`7773573`](#commit-7773573) |
| [backend/app/main.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/main.py) | FastAPI, middlewares, CORS/hosts, correlação/headers e health checks; docs públicos condicionados ao ambiente. | `request_observability`, `liveness`, `readiness`, `root` | [`18c7bdd`](#commit-18c7bdd) → [`7773573`](#commit-7773573) |

### Backend — models e relacionamentos

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/app/models/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`7773573`](#commit-7773573) |
| [backend/app/models/academic_record.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/academic_record.py) | Entidades, relações e constraints SQLAlchemy do domínio academic record. | `SubjectSyllabus`, `Assessment` | [`a740351`](#commit-a740351) |
| [backend/app/models/activity_history.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/activity_history.py) | Entidades, relações e constraints SQLAlchemy do domínio activity history. | `TaskStatusEvent`, `StudySegment` | [`527dab7`](#commit-527dab7) |
| [backend/app/models/calendar_event.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/calendar_event.py) | Entidades, relações e constraints SQLAlchemy do domínio calendar event. | `EventCategory`, `CalendarEvent` | [`eaa8194`](#commit-eaa8194) → [`c10cfcb`](#commit-c10cfcb) |
| [backend/app/models/material.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/material.py) | Entidades, relações e constraints SQLAlchemy do domínio material. | `MaterialCategory`, `MaterialStatus`, `Material` | [`eaa8194`](#commit-eaa8194) |
| [backend/app/models/note.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/note.py) | Entidades, relações e constraints SQLAlchemy do domínio note. | `Note` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/app/models/recovery_delivery.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/recovery_delivery.py) | Entidades, relações e constraints SQLAlchemy do domínio recovery delivery. | `RecoveryDelivery`, `RecoveryRateLock`, `RecoveryRateEvent` | [`7773573`](#commit-7773573) |
| [backend/app/models/study_session.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/study_session.py) | Entidades, relações e constraints SQLAlchemy do domínio study session. | `StudySessionStatus`, `StudySession [elapsed_seconds]` | [`eaa8194`](#commit-eaa8194) → [`527dab7`](#commit-527dab7) |
| [backend/app/models/subject.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/subject.py) | Entidades, relações e constraints SQLAlchemy do domínio subject. | `Subject` | [`18c7bdd`](#commit-18c7bdd) → [`a740351`](#commit-a740351) |
| [backend/app/models/task.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/task.py) | Entidades, relações e constraints SQLAlchemy do domínio task. | `Task` | [`18c7bdd`](#commit-18c7bdd) → [`527dab7`](#commit-527dab7) |
| [backend/app/models/user.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/user.py) | Entidades, relações e constraints SQLAlchemy do domínio user. | `User` | [`18c7bdd`](#commit-18c7bdd) → [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/app/models/user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/models/user_preferences.py) | Entidades, relações e constraints SQLAlchemy do domínio user preferences. | `UserPreferences` | [`ef66fd8`](#commit-ef66fd8) |

### Backend — schemas e validação

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/app/schemas/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/schemas/academic_record.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/academic_record.py) | Contratos Pydantic de entrada/saída e validações do domínio academic record. | `SyllabusInput`, `SyllabusResponse [utc_updated_at]`, `AssessmentInput [score_within_scale]`, `AssessmentResponse`, `GradeSummary`, `AssessmentList` | [`a740351`](#commit-a740351) |
| [backend/app/schemas/analytics.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/analytics.py) | Contratos Pydantic de entrada/saída e validações do domínio analytics. | `AnalyticsPeriod`, `LoadMetrics`, `AnalyticsDay`, `AnalyticsSubject`, `AnalyticsSummary`, `AnalyticsInsight`, `StudyComparison`, `StudyWeekday`, `StudyHour`, `SessionPatterns`, `PlanningDiagnostics`, `AnalyticsResponse` | [`1f8ef7c`](#commit-1f8ef7c) → [`527dab7`](#commit-527dab7) |
| [backend/app/schemas/calendar_event.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/calendar_event.py) | Contratos Pydantic de entrada/saída e validações do domínio calendar event. | `CalendarEventValidationError`, `validate_interval`, `RecurrenceInput [validate_days]`, `CalendarEventBase [end_after_start]`, `CalendarEventCreate [recurrence_until_after_start]`, `CalendarEventUpdate [required_fields_cannot_be_null]`, `CalendarEventResponse`, `CalendarEventWithSubject`, `CalendarEventCreateResult` | [`eaa8194`](#commit-eaa8194) → [`c10cfcb`](#commit-c10cfcb) |
| [backend/app/schemas/dashboard.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/dashboard.py) | Contratos Pydantic de entrada/saída e validações do domínio dashboard. | `SubjectProgress`, `DashboardResponse` | [`18c7bdd`](#commit-18c7bdd) → [`bc0ab44`](#commit-bc0ab44) |
| [backend/app/schemas/material.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/material.py) | Contratos Pydantic de entrada/saída e validações do domínio material. | `MaterialBase`, `MaterialCreate`, `MaterialUpdate`, `MaterialStatusUpdate`, `MaterialResponse`, `MaterialWithSubject`, `MaterialPage` | [`eaa8194`](#commit-eaa8194) → [`5396474`](#commit-5396474) |
| [backend/app/schemas/note.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/note.py) | Contratos Pydantic de entrada/saída e validações do domínio note. | `NoteBase [unique_tags]`, `NoteCreate`, `NoteUpdate [required_fields_not_null, unique_tags]`, `NoteResponse [expose_utc_timestamps]`, `NotePage`, `NoteSearchResult`, `NoteSearchPage` | [`1f8ef7c`](#commit-1f8ef7c) → [`5396474`](#commit-5396474) |
| [backend/app/schemas/study_session.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/study_session.py) | Contratos Pydantic de entrada/saída e validações do domínio study session. | `StudySessionCreate`, `StudySessionStopInput`, `StudySessionResponse [expose_utc_timestamps]`, `StudySessionWithContext` | [`eaa8194`](#commit-eaa8194) → [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/app/schemas/subject.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/subject.py) | Contratos Pydantic de entrada/saída e validações do domínio subject. | `SubjectValidationError`, `validate_subject_dates`, `SubjectBase`, `SubjectCreate [validate_period]`, `SubjectUpdate [name_cannot_be_null, validate_period]`, `SubjectResponse`, `SubjectWithProgress` | [`18c7bdd`](#commit-18c7bdd) → [`c10cfcb`](#commit-c10cfcb) |
| [backend/app/schemas/task.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/task.py) | Contratos Pydantic de entrada/saída e validações do domínio task. | `TaskStatus`, `TaskPriority`, `TaskBase`, `TaskCreate`, `TaskUpdate [required_fields_cannot_be_null]`, `TaskStatusUpdate`, `TaskResponse [completion_is_utc]`, `TaskWithSubject` | [`18c7bdd`](#commit-18c7bdd) → [`527dab7`](#commit-527dab7) |
| [backend/app/schemas/token.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/token.py) | Contratos Pydantic de entrada/saída e validações do domínio token. | `Token`, `TokenPayload` | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/schemas/user.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/user.py) | Contratos Pydantic de entrada/saída e validações do domínio user. | `UserBase`, `UserCreate [validate_password_bytes]`, `UserUpdate [validate_password_bytes]`, `UserResponse`, `ForgotPassword`, `ResetPassword [validate_password_bytes]` | [`18c7bdd`](#commit-18c7bdd) → [`a740351`](#commit-a740351) |
| [backend/app/schemas/user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/schemas/user_preferences.py) | Contratos Pydantic de entrada/saída e validações do domínio user preferences. | `PomodoroPreferences`, `PomodoroPreferencesPatch [not_null]`, `UserPreferencesResponse`, `UserPreferencesPatch [not_null]` | [`ef66fd8`](#commit-ef66fd8) |

### Backend — serviços e regras de negócio

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/app/services/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/app/services/academic_context.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/academic_context.py) | Resolve vínculos disciplina/tarefa/sessão e rejeita recursos alheios ou contexto inconsistente. | `AcademicContextNotFoundError`, `AcademicContextMismatchError`, `resolve_subject_id` | [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/app/services/academic_record_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/academic_record_service.py) | Salva plano/avaliações e calcula média parcial normalizada, pesos e cobertura. | `AssessmentContextError`, `summarize_grades`, `assessment_response`, `save_assessment`, `save_syllabus` | [`a740351`](#commit-a740351) |
| [backend/app/services/activity_history.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/activity_history.py) | Normaliza UTC e distribui intervalos ativos conhecidos entre dias no fuso do relatório. | `utc`, `distribute_session` | [`527dab7`](#commit-527dab7) |
| [backend/app/services/analytics_metrics.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/analytics_metrics.py) | Calcula comparação, padrões de sessões e diagnóstico de planejamento em funções separadas do carregamento. | `StudyRecord`, `compare_study`, `_streaks`, `session_patterns`, `planning_diagnostics` | [`0fec66b`](#commit-0fec66b) → [`527dab7`](#commit-527dab7) |
| [backend/app/services/analytics_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/analytics_service.py) | Carrega dados do proprietário e compõe analytics, carga, distribuição temporal e observações. | `AnalyticsValidationError`, `_utc`, `_calendar_local`, `_rate`, `_finish_load`, `_event_minutes_by_day`, `_insights`, `get_analytics` | [`1f8ef7c`](#commit-1f8ef7c) → [`527dab7`](#commit-527dab7) |
| [backend/app/services/auth_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/auth_service.py) | Localiza, autentica e cria usuários usando os utilitários de segurança. | `get_user_by_email`, `authenticate_user`, `create_user` | [`18c7bdd`](#commit-18c7bdd) → [`bc0ab44`](#commit-bc0ab44) |
| [backend/app/services/calendar_event_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/calendar_event_service.py) | Expande recorrência, consulta sobreposições e executa mutações de ocorrência/série e controle de aulas duplicadas. | `DuplicateClassError`, `_commit_events`, `_validate_class_duplicates`, `expand_recurrence`, `_to_with_subject`, `get_events_for_user`, `get_event_by_id`, `create_events`, `update_event`, `delete_event`, `delete_series` | [`eaa8194`](#commit-eaa8194) → [`c10cfcb`](#commit-c10cfcb) |
| [backend/app/services/dashboard_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/dashboard_service.py) | Agrega estados/progresso em uma consulta, preservando disciplinas sem tarefas. | `get_dashboard_metrics` | [`18c7bdd`](#commit-18c7bdd) → [`32c5e97`](#commit-32c5e97) |
| [backend/app/services/email_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/email_service.py) | Valida transporte SMTP e envia recuperação com TLS/SSL e timeout. | `EmailServiceUnavailable`, `ensure_configured`, `send_password_reset_email` | [`a740351`](#commit-a740351) → [`7773573`](#commit-7773573) |
| [backend/app/services/material_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/material_service.py) | CRUD/status e paginação de referências por disciplina e proprietário. | `_to_with_subject`, `get_materials_for_user`, `page_materials`, `get_materials_by_subject`, `get_material_by_id`, `create_material`, `update_material`, `update_material_status`, `delete_material` | [`eaa8194`](#commit-eaa8194) → [`5396474`](#commit-5396474) |
| [backend/app/services/note_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/note_service.py) | CRUD, contexto, busca e paginação de anotações com resposta resumida para pesquisa. | `_resolve_context`, `_response`, `get_note`, `list_notes`, `_filtered_notes`, `page_notes`, `search_notes`, `read_note`, `create_note`, `update_note`, `delete_note` | [`1f8ef7c`](#commit-1f8ef7c) → [`5396474`](#commit-5396474) |
| [backend/app/services/password_reset_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/password_reset_service.py) | Prepara pedido genérico e altera senha com token de finalidade/versão e atualização condicional. | `InvalidPasswordReset`, `prepare_password_reset`, `reset_password` | [`a740351`](#commit-a740351) → [`7773573`](#commit-7773573) |
| [backend/app/services/recovery_delivery_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/recovery_delivery_service.py) | Claim por lease, entrega/retry e descarte da outbox; expõe status e retenção. | `_eligible`, `deliver_one`, `queue_status`, `prune_finished` | [`7773573`](#commit-7773573) |
| [backend/app/services/recovery_rate_limit.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/recovery_rate_limit.py) | Controla janelas/limites compartilhados no banco usando chaves HMAC. | `PasswordResetRateLimited`, `utcnow`, `as_utc`, `RecoveryRateLimiter [_key, _lock, check]` | [`7773573`](#commit-7773573) |
| [backend/app/services/search.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/search.py) | Normaliza Unicode/tokens, aplica busca literal e ordena relevância no escopo do proprietário. | `normalize_search`, `search_tokens`, `_sqlite_fold`, `search_fields`, `apply_text_search`, `search_rank` | [`5396474`](#commit-5396474) |
| [backend/app/services/study_session_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/study_session_service.py) | Executa início/pausa/retomada/término, fecha segmentos atomicamente e trata conflito de sessão ativa. | `ActiveStudySessionError`, `_to_with_context`, `_transition`, `get_active_session`, `get_session_by_id`, `start_session`, `pause_session`, `resume_session`, `stop_session`, `delete_session`, `get_sessions_for_user`, `get_active_session_with_context` | [`eaa8194`](#commit-eaa8194) → [`527dab7`](#commit-527dab7) |
| [backend/app/services/subject_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/subject_service.py) | CRUD/progresso de disciplinas com consultas e exclusão contextualizadas pelo dono. | `get_subjects`, `get_subjects_with_progress`, `get_subject_by_id`, `create_subject`, `update_subject`, `delete_subject`, `get_subject_with_progress` | [`18c7bdd`](#commit-18c7bdd) → [`c10cfcb`](#commit-c10cfcb) |
| [backend/app/services/task_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/task_service.py) | CRUD/status de tarefas e histórico prospectivo por transição condicional. | `TaskStateConflict`, `_change_status`, `get_tasks_by_subject`, `get_tasks_for_user`, `get_task_by_id`, `create_task`, `update_task`, `update_task_status`, `delete_task` | [`18c7bdd`](#commit-18c7bdd) → [`527dab7`](#commit-527dab7) |
| [backend/app/services/user_preferences_service.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/services/user_preferences_service.py) | Lê defaults sem inserir linha e grava somente os campos enviados por usuário. | `read_preferences`, `update_preferences` | [`ef66fd8`](#commit-ef66fd8) |

### Backend — workers e operação

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/app/workers/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/workers/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`7773573`](#commit-7773573) |
| [backend/app/workers/email_worker.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/workers/email_worker.py) | Processo separado da API para polling, entrega, status e retenção da outbox. | `main` | [`7773573`](#commit-7773573) |
| [backend/scripts/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/scripts/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`4db98ce`](#commit-4db98ce) |
| [backend/scripts/sqlite_backup.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/scripts/sqlite_backup.py) | CLI de snapshot online, manifesto/hash, verificação e restauração para arquivo novo. | `_connect_readonly`, `_sha256`, `_manifest_path`, `inspect_snapshot`, `verify_snapshot`, `backup_database`, `restore_database`, `main` | [`4db98ce`](#commit-4db98ce) |

### Backend — testes e fixtures

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [backend/tests/__init__.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/__init__.py) | Inicializador/registro de pacote; seu papel é composição e imports, não uma funcionalidade autônoma. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/tests/conftest.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/conftest.py) | Fixtures isoladas de banco/HTTP/usuários e bcrypt reduzido somente durante testes, com restauração. | `_override_get_db`, `_fast_test_password_hashes`, `_fresh_database`, `client`, `auth_headers`, `make_auth_headers`, `subject`, `academic_data` | [`eaa8194`](#commit-eaa8194) → [`49ccfb8`](#commit-49ccfb8) |
| [backend/tests/test_academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_academic_records.py) | Testes isolados de academic records; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `scope`, `test_syllabus_roundtrip_and_user_isolation`, `test_first_syllabus_save_race_returns_conflict_and_keeps_committed_copy`, `test_partial_weighted_mean_normalizes_scales_and_never_treats_missing_as_zero`, `test_assessment_validation`, `test_ownership_update_delete_and_task_context`, `test_task_move_detaches_grade_but_keeps_subject_history`, `test_subject_delete_removes_owned_records_without_affecting_other_user`, `test_academic_migration_preserves_old_rows_and_matches_metadata` | [`a740351`](#commit-a740351) |
| [backend/tests/test_activity_history.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_activity_history.py) | Testes isolados de activity history; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_task_transitions_record_actual_time_once_and_keep_reopening_history`, `test_create_completed_task_records_creation_and_delete_removes_events`, `test_task_compare_and_swap_rejects_stale_transition`, `test_pause_resume_stop_store_only_active_intervals_and_reject_stale_writer`, `test_distribution_splits_midnight_and_dst_without_allocating_pauses`, `test_analytics_counts_status_history_separately_and_retains_legacy_evidence` | [`527dab7`](#commit-527dab7) |
| [backend/tests/test_analytics.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_analytics.py) | Testes isolados de analytics; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `records`, `test_load_subtracts_completed_work_and_scheduled_blocks_once_and_is_private`, `test_calendar_overnight_is_split_locally_and_study_utc_uses_local_day`, `test_capacity_overdue_and_missing_estimates_are_explicit`, `test_elapsed_consistency_excludes_future_days_and_zero_period_is_honest`, `test_finished_sessions_outside_period_reduce_remaining_task_estimate`, `test_analytics_endpoint_validation_and_authentication`, `test_service_rejects_invalid_period`, `_study`, `test_partial_comparison_matches_elapsed_days_in_previous_window_and_is_private`, `test_comparison_zero_baseline_and_future_are_not_percentage_growth`, `test_completed_period_comparison_uses_whole_selected_window`, `test_session_patterns_use_local_start_duration_distribution_and_bounded_streak`, `test_streak_stops_at_gaps_and_historical_end_without_today_grace`, `test_future_dated_execution_does_not_become_study_or_reduce_estimate`, `test_planning_coverage_caps_blocks_by_task_and_load_diagnostics_do_not_hide_missing_data`, `test_empty_planning_coverage_is_unavailable_not_zero_or_full` | [`879c43b`](#commit-879c43b) → [`0fec66b`](#commit-0fec66b) |
| [backend/tests/test_auth.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_auth.py) | Testes isolados de auth; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_register_creates_user`, `test_register_duplicate_email_fails`, `test_login_success_returns_token`, `test_login_wrong_password_returns_401`, `test_login_nonexistent_user_returns_401_not_500`, `test_protected_route_requires_token`, `test_protected_route_rejects_invalid_token` | [`eaa8194`](#commit-eaa8194) → [`a08176e`](#commit-a08176e) |
| [backend/tests/test_calendar_events.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_calendar_events.py) | Testes isolados de calendar events; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_create_single_event`, `test_create_recurring_weekly_event_generates_correct_occurrences`, `test_recurrence_until_before_start_returns_422`, `test_create_event_with_invalid_subject_returns_404`, `test_create_event_with_invalid_task_returns_404`, `test_create_event_linked_to_task`, `test_deleting_linked_task_sets_null_not_delete_event`, `test_list_events_filtered_by_date_range`, `test_update_single_occurrence`, `test_delete_single_occurrence`, `test_delete_entire_series`, `test_user_cannot_see_other_users_events`, `test_user_cannot_delete_other_users_event_series`, `test_study_block_derives_subject_from_task`, `test_study_block_rejects_mismatched_task_subject_on_create_and_update`, `test_replacing_only_task_derives_new_subject`, `test_event_partial_update_validates_merged_interval_and_required_fields`, `test_invalid_calendar_filters_and_mixed_timezone_return_422`, `test_recurrence_without_occurrences_is_rejected`, `test_user_cannot_link_or_update_other_users_planning_context`, `test_calendar_range_includes_overnight_study_overlap`, `test_calendar_range_is_half_open_at_midnight_and_preserves_point_events` | [`eaa8194`](#commit-eaa8194) → [`879c43b`](#commit-879c43b) |
| [backend/tests/test_class_index.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_class_index.py) | Testes isolados de class index; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_database_rejects_duplicate_classes_without_service_but_preserves_other_events`, `test_constraint_race_returns_409_and_rolls_back_entire_series`, `test_constraint_race_on_update_preserves_occurrence`, `test_partial_index_compiles_for_sqlite_sql_server_and_postgresql`, `test_class_index_upgrade_downgrade_matches_metadata_and_preserves_rows`, `test_class_index_migration_reports_legacy_duplicates_without_changing_rows` | [`c10cfcb`](#commit-c10cfcb) |
| [backend/tests/test_dashboard.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_dashboard.py) | Testes isolados de dashboard; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_dashboard_empty_state`, `test_dashboard_reflects_tasks_and_subjects`, `test_dashboard_isolated_per_user`, `test_dashboard_aggregates_statuses_and_keeps_empty_subjects_without_foreign_task_data`, `test_dashboard_uses_one_query_independent_of_subject_count` | [`eaa8194`](#commit-eaa8194) → [`32c5e97`](#commit-32c5e97) |
| [backend/tests/test_materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_materials.py) | Testes isolados de materials; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_create_material`, `test_create_material_without_subject_fails_validation`, `test_create_material_invalid_subject_returns_404`, `test_create_material_invalid_category_returns_422`, `test_list_materials_includes_subject_name`, `test_list_materials_by_subject`, `test_update_material`, `test_update_material_status`, `test_delete_material`, `test_deleting_subject_cascades_to_materials`, `test_user_cannot_create_material_in_other_users_subject`, `test_user_cannot_see_other_users_materials`, `test_user_cannot_update_or_delete_other_users_material` | [`eaa8194`](#commit-eaa8194) |
| [backend/tests/test_notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_notes.py) | Testes isolados de notes; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_notes_crud_search_filters_and_normalization`, `test_notes_require_authentication`, `test_notes_are_private_and_invalid_foreign_links_do_not_mutate`, `test_note_context_must_match_subject_task_and_session`, `test_note_validation_and_failed_update_are_atomic`, `test_replacing_task_derives_subject_and_context_can_be_cleared`, `test_deleting_academic_context_preserves_note_content`, `test_task_notes_follow_intention_session_notes_keep_historical_context` | [`879c43b`](#commit-879c43b) |
| [backend/tests/test_password_reset.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_password_reset.py) | Testes isolados de password reset; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `reset_recovery_limits`, `initial_hash`, `reset_users`, `configured_mail`, `token_for`, `test_missing_mail_configuration_fails_before_lookup_uniformly`, `test_forgot_has_same_response_for_existing_unknown_inactive_and_link_is_trusted_fragment`, `test_reset_changes_only_target_account_rejects_old_password_and_replay`, `test_invalid_reset_variants_fail_generically_and_preserve_password`, `test_reset_token_cannot_access_authenticated_routes`, `test_expiry_uses_configured_window_and_hash_not_exposed`, `test_password_bounds_apply_to_register_and_reset`, `test_unicode_72_byte_password_works_without_bcrypt_truncation`, `test_atomic_update_rejects_token_if_credential_changes_after_read`, `test_recovery_cooldown_uniform_for_unknown_and_known_and_expires`, `test_recovery_email_window_and_ip_limit_survive_limiter_instances`, `test_smtp_transport_uses_tls_timeout_auth_and_sends_only_expected_message`, `test_smtp_failure_never_changes_public_acceptance_or_logs_personal_data`, `test_frontend_origin_rejects_untrusted_shapes`, `test_email_configuration_rejects_conflicting_tls_and_partial_credentials` | [`a740351`](#commit-a740351) → [`7773573`](#commit-7773573) |
| [backend/tests/test_recovery_migration.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_recovery_migration.py) | Testes isolados de recovery migration; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_recovery_migration_upgrade_downgrade_preserves_users_and_academic_data` | [`7773573`](#commit-7773573) |
| [backend/tests/test_recovery_operations.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_recovery_operations.py) | Testes isolados de recovery operations; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `local_smtp`, `_user_and_delivery`, `test_real_loopback_smtp_retry_persists_and_reset_targets_only_owner`, `test_invalid_queued_delivery_is_discarded_without_smtp`, `test_attempt_limit_and_abandoned_lease_are_recovered`, `file_sessions`, `test_workers_cannot_claim_same_delivery_concurrently`, `test_shared_rate_limit_is_atomic_across_sessions_and_does_not_consume_rejected_email`, `test_health_and_headers_expose_no_configuration`, `test_readiness_rejects_missing_operational_migration_generically`, `_production_config`, `test_production_rejects_insecure_configuration`, `test_production_accepts_explicit_secure_configuration`, `test_invalid_configuration_traceback_does_not_include_secrets` | [`7773573`](#commit-7773573) |
| [backend/tests/test_search_pagination.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_search_pagination.py) | Testes isolados de search pagination; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_note_pages_are_bounded_stable_and_keep_legacy_list`, `test_note_search_matches_full_unicode_content_tags_and_context_but_transfers_only_excerpt`, `test_search_wildcards_are_literal_and_edits_are_immediately_searchable`, `test_material_pagination_filters_and_tab_counts_cover_full_scope`, `test_search_page_validation_and_authentication` | [`5396474`](#commit-5396474) |
| [backend/tests/test_sqlite_backup.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_sqlite_backup.py) | Testes isolados de sqlite backup; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_online_wal_backup_and_restore_preserve_values_without_touching_original`, `test_backup_and_restore_refuse_overwrite_and_detect_tampering`, `test_nonexistent_source_does_not_leave_empty_destination` | [`4db98ce`](#commit-4db98ce) |
| [backend/tests/test_study_session_migration.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_study_session_migration.py) | Testes isolados de study session migration; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `migration_database`, `test_active_session_index_upgrade_and_downgrade`, `test_active_session_migration_reports_duplicates_without_changing_history`, `test_clean_install_and_incremental_upgrade_match_models_and_preserve_data`, `test_notes_upgrade_and_downgrade_preserve_existing_academic_data`, `test_legacy_079_core_upgrades_without_stamp_or_recreating_existing_rows` | [`1f8ef7c`](#commit-1f8ef7c) → [`527dab7`](#commit-527dab7) |
| [backend/tests/test_study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_study_sessions.py) | Testes isolados de study sessions; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_no_active_session_initially`, `test_start_session`, `test_cannot_start_second_session_while_one_active`, `test_start_with_invalid_subject_returns_404`, `test_start_with_invalid_task_returns_404`, `test_active_session_includes_subject_and_task_context`, `test_pause_freezes_elapsed_time`, `test_pause_when_not_active_returns_404`, `test_resume_after_pause`, `test_resume_when_not_paused_returns_404`, `test_full_cycle_accumulates_time_across_pause_resume`, `test_actions_on_completed_session_return_404`, `test_active_session_is_null_after_stop`, `test_history_lists_sessions_most_recent_first`, `test_delete_session_from_history`, `test_deleting_linked_task_sets_null_on_session`, `test_user_cannot_control_other_users_session`, `test_task_only_session_derives_subject_and_does_not_complete_task`, `test_session_rejects_mismatched_context_without_creating_execution`, `test_paused_execution_blocks_new_session_until_stopped`, `test_stale_active_session_check_still_returns_conflict_and_rolls_back`, `test_user_cannot_start_execution_with_another_users_context` | [`eaa8194`](#commit-eaa8194) → [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/tests/test_subject_schedule.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_subject_schedule.py) | Testes isolados de subject schedule; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_subject_metadata_round_trips_and_partial_dates_are_validated`, `test_subject_write_validation_and_ownership`, `test_delete_subject_preserves_history_and_notes_but_removes_owned_tasks_materials`, `_class`, `test_weekly_grade_uses_unique_weekdays_and_filters_by_subject_category`, `test_grade_duplicate_is_rejected_before_inserting_any_occurrence`, `test_grade_limits_and_invalid_weekdays_leave_database_unchanged`, `test_edit_class_occurrence_checks_duplicates_and_series_delete_is_isolated` | [`c10cfcb`](#commit-c10cfcb) |
| [backend/tests/test_subjects.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_subjects.py) | Testes isolados de subjects; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_create_subject`, `test_list_subjects`, `test_get_subject_by_id`, `test_get_nonexistent_subject_returns_404`, `test_update_subject`, `test_delete_subject`, `test_subject_progress_reflects_tasks`, `test_user_cannot_see_other_users_subject`, `test_user_cannot_update_other_users_subject`, `test_user_cannot_delete_other_users_subject` | [`eaa8194`](#commit-eaa8194) |
| [backend/tests/test_tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_tasks.py) | Testes isolados de tasks; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_create_task_minimal`, `test_create_task_with_priority_and_estimated_hours`, `test_create_task_invalid_priority_returns_422`, `test_create_task_zero_estimated_hours_returns_422`, `test_create_task_invalid_subject_returns_404`, `test_list_all_tasks_includes_subject_name`, `test_list_tasks_by_subject`, `test_update_task_status`, `test_update_task_priority_and_hours_via_put`, `test_delete_task`, `test_delete_nonexistent_task_returns_404`, `test_tasks_ordered_by_due_date_nulls_last`, `test_user_cannot_see_other_users_tasks`, `test_user_cannot_update_other_users_task`, `test_user_cannot_create_task_in_other_users_subject`, `test_planner_task_rejects_blank_title_and_non_finite_estimates`, `test_task_partial_update_rejects_null_required_fields_and_keeps_data`, `test_moving_task_updates_planning_but_preserves_execution_context`, `test_cannot_move_task_into_another_users_subject` | [`eaa8194`](#commit-eaa8194) → [`1f8ef7c`](#commit-1f8ef7c) |
| [backend/tests/test_user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_user_preferences.py) | Testes isolados de user preferences; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_read_defaults_does_not_write_and_patch_persists_across_clients`, `test_partial_updates_preserve_other_preferences_and_owner_isolation`, `test_invalid_preferences_do_not_persist`, `test_boundary_preferences_and_empty_patch` | [`ef66fd8`](#commit-ef66fd8) |
| [backend/tests/test_user_preferences_migration.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/tests/test_user_preferences_migration.py) | Testes isolados de user preferences migration; nomes abaixo indicam cenários declarados, não comprovam execução nesta edição. | `test_preferences_upgrade_and_downgrade_preserve_existing_owner` | [`ef66fd8`](#commit-ef66fd8) |

### Frontend — API e contratos

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [frontend/src/api/academicRecords.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/academicRecords.ts) | Cliente HTTP tipado de academicRecords; sem regra visual nem duplicação de entidade. | `academicRecordsApi` | [`a740351`](#commit-a740351) → [`45e9d6a`](#commit-45e9d6a) |
| [frontend/src/api/analytics.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/analytics.ts) | Cliente HTTP tipado de analytics; sem regra visual nem duplicação de entidade. | `AnalyticsQuery`, `fetchAnalytics` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/api/authRecovery.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/authRecovery.ts) | Cliente HTTP tipado de authRecovery; sem regra visual nem duplicação de entidade. | `requestPasswordRecovery`, `resetPassword` | [`a740351`](#commit-a740351) |
| [frontend/src/api/client.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/client.ts) | Cliente HTTP tipado de configuração Axios/Authorization; sem regra visual nem duplicação de entidade. | Sem definição de topo autônoma; composição, estilo ou template. | [`18c7bdd`](#commit-18c7bdd) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/api/dashboard.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/dashboard.ts) | Cliente HTTP tipado de dashboard; sem regra visual nem duplicação de entidade. | `DashboardWorkspace`, `fetchDashboardWorkspace` | [`879c43b`](#commit-879c43b) |
| [frontend/src/api/materials.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/materials.ts) | Cliente HTTP tipado de materials; sem regra visual nem duplicação de entidade. | `MaterialPage`, `MaterialFilters`, `materialsApi` | [`5396474`](#commit-5396474) |
| [frontend/src/api/notes.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/notes.ts) | Cliente HTTP tipado de notes; sem regra visual nem duplicação de entidade. | `NoteSearchItem`, `notesApi` | [`879c43b`](#commit-879c43b) → [`5396474`](#commit-5396474) |
| [frontend/src/api/studyPlanner.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/api/studyPlanner.ts) | Cliente HTTP tipado de studyPlanner; sem regra visual nem duplicação de entidade. | `StudyPlannerData`, `fetchStudyPlanner`, `setGoalStatus`, `deleteGoal`, `scheduleStudyBlock` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/types/academicRecords.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/types/academicRecords.ts) | Interfaces/uniões do contrato academicRecords, compartilhadas por API, regras e apresentação. | `SubjectSyllabusInput`, `SubjectSyllabus`, `AssessmentInput`, `Assessment`, `GradeSummary`, `AssessmentList` | [`a740351`](#commit-a740351) |
| [frontend/src/types/analytics.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/types/analytics.ts) | Interfaces/uniões do contrato analytics, compartilhadas por API, regras e apresentação. | `AnalyticsPeriod`, `AnalyticsAction`, `AnalyticsInsight`, `AnalyticsComparison`, `AnalyticsSessionPatterns`, `AnalyticsPlanningDiagnostics`, `AnalyticsDay`, `AnalyticsSubject`, `AcademicAnalytics` | [`1f8ef7c`](#commit-1f8ef7c) → [`527dab7`](#commit-527dab7) |
| [frontend/src/types/index.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/types/index.ts) | Interfaces/uniões do contrato index, compartilhadas por API, regras e apresentação. | `User`, `Subject`, `TaskStatus`, `TaskPriority`, `Task`, `TaskWithSubject`, `SubjectProgress`, `DashboardData`, `EventCategory`, `CalendarEventRecurrenceInput`, `CalendarEventBase`, `CalendarEventCreateInput`, `CalendarEvent`, `CalendarEventWithSubject`, `StudySessionStatus`, `StudySession`, `StudySessionWithContext`, `MaterialCategory`, `MaterialStatus`, `Material`, `MaterialWithSubject` | [`18c7bdd`](#commit-18c7bdd) → [`527dab7`](#commit-527dab7) |
| [frontend/src/types/notes.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/types/notes.ts) | Interfaces/uniões do contrato notes, compartilhadas por API, regras e apresentação. | `Note`, `NoteInput` | [`879c43b`](#commit-879c43b) |
| [frontend/src/types/pagination.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/types/pagination.ts) | Interfaces/uniões do contrato pagination, compartilhadas por API, regras e apresentação. | `Page` | [`5396474`](#commit-5396474) |

### Frontend — componentes e estilos de domínio

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [frontend/src/components/AuthLayout.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/AuthLayout.tsx) | Portal compartilhado de login/cadastro/recuperação com marca, ajuda e tema. | `AuthLayoutProps`, `AuthLayout` | [`b03058c`](#commit-b03058c) → [`7cbabaa`](#commit-7cbabaa) |
| [frontend/src/components/CommandPalette.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/CommandPalette.tsx) | Atalho Ctrl/Cmd+K, navegação e busca contextual com falhas parciais e cancelamento. | `CommandPaletteProps`, `CommandItem`, `CommandPalette` | [`eaa8194`](#commit-eaa8194) → [`5396474`](#commit-5396474) |
| [frontend/src/components/DashboardLayout.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/DashboardLayout.tsx) | Shell interno com navegação, cabeçalho e área de conteúdo responsiva. | `DashboardLayout` | [`b895823`](#commit-b895823) → [`124b408`](#commit-124b408) |
| [frontend/src/components/Logo.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/Logo.tsx) | Símbolo da marca interna, sem duplicar nome/slogan do acesso. | `LogoProps`, `Logo`, `BrandArtwork` | [`eaa8194`](#commit-eaa8194) → [`879c43b`](#commit-879c43b) |
| [frontend/src/components/NoteEditor.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/NoteEditor.tsx) | Editor de texto simples com campos/contexto e proteção contra perda de rascunho. | `NoteEditorProps`, `NoteEditor` | [`879c43b`](#commit-879c43b) |
| [frontend/src/components/PreferencesSyncStatus.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/PreferencesSyncStatus.tsx) | Loading, gravação, sucesso/erro e nova tentativa das preferências. | `PreferencesSyncStatus` | [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/components/PrivateRoute.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/PrivateRoute.tsx) | Valida sessão e exibe introdução antes de montar Outlet/Dashboard. | `PrivateRoute` | [`18c7bdd`](#commit-18c7bdd) → [`2ceb44c`](#commit-2ceb44c) |
| [frontend/src/components/RouteContent.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/RouteContent.tsx) | Limite de loading/erro das rotas lazy e recuperação de carregamento. | `PageBoundary`, `RouteContent` | [`879c43b`](#commit-879c43b) |
| [frontend/src/components/Sidebar.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/Sidebar.tsx) | Navegação por áreas; modo recolhido e manutenção do item ativo na região rolável. | `NavItem`, `NavGroup`, `SidebarProps`, `Sidebar` | [`b895823`](#commit-b895823) → [`124b408`](#commit-124b408) |
| [frontend/src/components/ThemeToggle.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ThemeToggle.tsx) | Alternância acessível de tema usando o contexto e alvo mínimo de interação. | `ThemeToggle` | [`1f8ef7c`](#commit-1f8ef7c) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/components/Topbar.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/Topbar.tsx) | Pesquisa global, ações, notificações e menu da conta. | `TopbarProps`, `Topbar` | [`eaa8194`](#commit-eaa8194) → [`de95b44`](#commit-de95b44) |
| [frontend/src/components/analytics/AcademicLoadChart.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/AcademicLoadChart.tsx) | Apresentação analítica AcademicLoadChart; consome métricas existentes, contexto de período e alternativas acessíveis. | `AcademicLoadChart` | [`b03058c`](#commit-b03058c) → [`879c43b`](#commit-879c43b) |
| [frontend/src/components/analytics/AcademicMetric.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/AcademicMetric.tsx) | Apresentação analítica AcademicMetric; consome métricas existentes, contexto de período e alternativas acessíveis. | `AcademicMetricProps`, `AcademicMetric` | [`879c43b`](#commit-879c43b) |
| [frontend/src/components/analytics/AnalyticsControls.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/AnalyticsControls.tsx) | Apresentação analítica AnalyticsControls; consome métricas existentes, contexto de período e alternativas acessíveis. | `AnalyticsControlsProps`, `AnalyticsControls` | [`1f8ef7c`](#commit-1f8ef7c) → [`124b408`](#commit-124b408) |
| [frontend/src/components/analytics/AnalyticsMethodology.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/AnalyticsMethodology.tsx) | Apresentação analítica AnalyticsMethodology; consome métricas existentes, contexto de período e alternativas acessíveis. | `AnalyticsMethodology` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/components/analytics/AnalyticsState.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/AnalyticsState.tsx) | Apresentação analítica AnalyticsState; consome métricas existentes, contexto de período e alternativas acessíveis. | `AnalyticsLoading`, `AnalyticsError` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/components/analytics/CompletionHistory.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/CompletionHistory.tsx) | Apresentação analítica CompletionHistory; consome métricas existentes, contexto de período e alternativas acessíveis. | `CompletionHistory` | [`527dab7`](#commit-527dab7) |
| [frontend/src/components/analytics/PeriodComparison.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/PeriodComparison.tsx) | Apresentação analítica PeriodComparison; consome métricas existentes, contexto de período e alternativas acessíveis. | `PeriodComparison` | [`e90f979`](#commit-e90f979) |
| [frontend/src/components/analytics/PlanningDiagnostics.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/PlanningDiagnostics.tsx) | Apresentação analítica PlanningDiagnostics; consome métricas existentes, contexto de período e alternativas acessíveis. | `PlanningDiagnostics` | [`e90f979`](#commit-e90f979) → [`539cc68`](#commit-539cc68) |
| [frontend/src/components/analytics/StudyConsistency.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/StudyConsistency.tsx) | Apresentação analítica StudyConsistency; consome métricas existentes, contexto de período e alternativas acessíveis. | `StudyConsistency` | [`e90f979`](#commit-e90f979) |
| [frontend/src/components/analytics/StudyPatterns.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/StudyPatterns.tsx) | Apresentação analítica StudyPatterns; consome métricas existentes, contexto de período e alternativas acessíveis. | `StudyPatterns` | [`e90f979`](#commit-e90f979) → [`527dab7`](#commit-527dab7) |
| [frontend/src/components/analytics/StudyTrendChart.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/StudyTrendChart.tsx) | Apresentação analítica StudyTrendChart; consome métricas existentes, contexto de período e alternativas acessíveis. | `StudyTrendChart`, `analyticsTooltipStyle` | [`1f8ef7c`](#commit-1f8ef7c) → [`879c43b`](#commit-879c43b) |
| [frontend/src/components/analytics/SubjectAnalytics.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/analytics/SubjectAnalytics.tsx) | Apresentação analítica SubjectAnalytics; consome métricas existentes, contexto de período e alternativas acessíveis. | `SubjectSort`, `SubjectAnalytics` | [`e90f979`](#commit-e90f979) |
| [frontend/src/components/auth/AuthBackdrop.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthBackdrop.tsx) | Geometria SVG e composição do fundo com deslocamento por ponteiro sob demanda. | `Cube`, `AuthBackdrop` | [`e214a9e`](#commit-e214a9e) → [`1044f08`](#commit-1044f08) |
| [frontend/src/components/auth/AuthBrand.css](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthBrand.css) | Proporção, máscara e tipografia responsiva da marca de acesso. | Sem definição de topo autônoma; composição, estilo ou template. | [`7cbabaa`](#commit-7cbabaa) |
| [frontend/src/components/auth/AuthBrand.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthBrand.tsx) | Composição completa do símbolo, nome e slogan apenas na entrada. | `AuthBrand` | [`7cbabaa`](#commit-7cbabaa) |
| [frontend/src/components/auth/AuthHelp.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthHelp.tsx) | Ajuda de acesso acionável por teclado com Escape e restauração de foco. | `AuthHelp` | [`e214a9e`](#commit-e214a9e) |
| [frontend/src/components/auth/AuthIdentitySummary.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthIdentitySummary.tsx) | Resumo da identidade entre etapas com ação de voltar/editar. | `AuthIdentitySummaryProps`, `AuthIdentitySummary` | [`e214a9e`](#commit-e214a9e) |
| [frontend/src/components/auth/AuthLayout.css](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthLayout.css) | Layout centralizado do portal e adaptações de tema/responsividade/teclado. | Sem definição de topo autônoma; composição, estilo ou template. | [`d91f096`](#commit-d91f096) → [`6b6039a`](#commit-6b6039a) |
| [frontend/src/components/auth/AuthNetwork.css](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthNetwork.css) | Cores/estilos da rede nos temas e alternativas sem movimento. | Sem definição de topo autônoma; composição, estilo ou template. | [`6b6039a`](#commit-6b6039a) → [`d09b347`](#commit-d09b347) |
| [frontend/src/components/auth/AuthNetwork.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthNetwork.tsx) | Rede Canvas 2D por proximidade; limita densidade/DPR/fps e limpa observers/rAF. | `Particle`, `createParticle`, `AuthNetwork` | [`1044f08`](#commit-1044f08) → [`d09b347`](#commit-d09b347) |
| [frontend/src/components/auth/AuthSuccessIntro.css](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthSuccessIntro.css) | Viewport completo com cover centralizado; sem rodapé ou controles visíveis. | Sem definição de topo autônoma; composição, estilo ou template. | [`2ceb44c`](#commit-2ceb44c) → [`44eaddc`](#commit-44eaddc) |
| [frontend/src/components/auth/AuthSuccessIntro.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/auth/AuthSuccessIntro.tsx) | Player temático em tela cheia, autoplay muted, fallback, Escape e limites de espera. | `AuthSuccessIntroProps`, `PlaybackState`, `AuthSuccessIntro` | [`2ceb44c`](#commit-2ceb44c) → [`64e4948`](#commit-64e4948) |
| [frontend/src/components/calendar/DayView.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/calendar/DayView.tsx) | Visualização/formulário de calendário DayView; reserva/projeção permanecem nos módulos de domínio. | `DayViewProps`, `DayView` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/calendar/EventModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/calendar/EventModal.tsx) | Visualização/formulário de calendário EventModal; reserva/projeção permanecem nos módulos de domínio. | `EventModalProps`, `FormValues`, `EventModal` | [`eaa8194`](#commit-eaa8194) → [`879c43b`](#commit-879c43b) |
| [frontend/src/components/calendar/MonthView.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/calendar/MonthView.tsx) | Visualização/formulário de calendário MonthView; reserva/projeção permanecem nos módulos de domínio. | `MonthViewProps`, `MonthView` | [`eaa8194`](#commit-eaa8194) → [`879c43b`](#commit-879c43b) |
| [frontend/src/components/calendar/TimeGrid.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/calendar/TimeGrid.tsx) | Visualização/formulário de calendário TimeGrid; reserva/projeção permanecem nos módulos de domínio. | `TimeGridProps`, `formatTimeRange`, `TimeGrid` | [`eaa8194`](#commit-eaa8194) → [`879c43b`](#commit-879c43b) |
| [frontend/src/components/calendar/WeekView.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/calendar/WeekView.tsx) | Visualização/formulário de calendário WeekView; reserva/projeção permanecem nos módulos de domínio. | `WeekViewProps`, `WeekView` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/dashboard/DashboardDeadlinePressure.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/dashboard/DashboardDeadlinePressure.tsx) | Seção do Dashboard DashboardDeadlinePressure, separada da seleção/cálculo compartilhado das regras. | `DashboardDeadlinePressure` | [`ebd678e`](#commit-ebd678e) |
| [frontend/src/components/dashboard/DashboardNextAction.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/dashboard/DashboardNextAction.tsx) | Seção do Dashboard DashboardNextAction, separada da seleção/cálculo compartilhado das regras. | `DashboardNextAction` | [`ebd678e`](#commit-ebd678e) |
| [frontend/src/components/dashboard/DashboardWeeklyCharts.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/dashboard/DashboardWeeklyCharts.tsx) | Seção do Dashboard DashboardWeeklyCharts, separada da seleção/cálculo compartilhado das regras. | `DashboardWeeklyChartsProps`, `DashboardWeeklyCharts` | [`a43928e`](#commit-a43928e) |
| [frontend/src/components/dashboard/PriorityTasks.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/dashboard/PriorityTasks.tsx) | Seção do Dashboard PriorityTasks, separada da seleção/cálculo compartilhado das regras. | `PriorityTasksProps`, `PriorityTasks` | [`879c43b`](#commit-879c43b) → [`ebd678e`](#commit-ebd678e) |
| [frontend/src/components/dashboard/TodayAgenda.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/dashboard/TodayAgenda.tsx) | Seção do Dashboard TodayAgenda, separada da seleção/cálculo compartilhado das regras. | `eventTime`, `TodayAgenda` | [`879c43b`](#commit-879c43b) |
| [frontend/src/components/dashboard/UpcomingDeadlines.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/dashboard/UpcomingDeadlines.tsx) | Seção do Dashboard UpcomingDeadlines, separada da seleção/cálculo compartilhado das regras. | `UpcomingDeadlines` | [`879c43b`](#commit-879c43b) |
| [frontend/src/components/study/ScheduleStudyModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/study/ScheduleStudyModal.tsx) | Componente do Planner ScheduleStudyModal: objetivo Task ou reserva de estudo CalendarEvent. | `ScheduleStudyModal` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/components/study/StudyGoalRow.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/study/StudyGoalRow.tsx) | Componente do Planner StudyGoalRow: objetivo Task ou reserva de estudo CalendarEvent. | `StudyGoalRow` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/components/subjects/AssessmentDeleteModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/AssessmentDeleteModal.tsx) | Componente acadêmico AssessmentDeleteModal: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `Props`, `AssessmentDeleteModal` | [`a740351`](#commit-a740351) |
| [frontend/src/components/subjects/AssessmentFormModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/AssessmentFormModal.tsx) | Componente acadêmico AssessmentFormModal: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `Props`, `AssessmentFormModal` | [`a740351`](#commit-a740351) |
| [frontend/src/components/subjects/AssessmentsCard.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/AssessmentsCard.tsx) | Componente acadêmico AssessmentsCard: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `GradeSummaryView`, `AssessmentRow`, `AssessmentsCard` | [`a740351`](#commit-a740351) |
| [frontend/src/components/subjects/ClassSchedule.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/ClassSchedule.tsx) | Componente acadêmico ClassSchedule: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `Props`, `ClassSchedule` | [`c10cfcb`](#commit-c10cfcb) |
| [frontend/src/components/subjects/ClassScheduleFormModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/ClassScheduleFormModal.tsx) | Componente acadêmico ClassScheduleFormModal: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `Props`, `ClassScheduleFormModal` | [`c10cfcb`](#commit-c10cfcb) |
| [frontend/src/components/subjects/DiscardAcademicChangesModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/DiscardAcademicChangesModal.tsx) | Componente acadêmico DiscardAcademicChangesModal: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `Props`, `DiscardAcademicChangesModal` | [`a740351`](#commit-a740351) |
| [frontend/src/components/subjects/SubjectAcademicRecords.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/SubjectAcademicRecords.tsx) | Componente acadêmico SubjectAcademicRecords: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `SubjectAcademicRecords` | [`a740351`](#commit-a740351) |
| [frontend/src/components/subjects/SubjectDeleteModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/SubjectDeleteModal.tsx) | Componente acadêmico SubjectDeleteModal: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `Props`, `SubjectDeleteModal` | [`c10cfcb`](#commit-c10cfcb) → [`a740351`](#commit-a740351) |
| [frontend/src/components/subjects/SubjectFormModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/SubjectFormModal.tsx) | Componente acadêmico SubjectFormModal: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `FormValues`, `Props`, `SubjectFormModal` | [`c10cfcb`](#commit-c10cfcb) |
| [frontend/src/components/subjects/SyllabusCard.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/SyllabusCard.tsx) | Componente acadêmico SyllabusCard: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `SyllabusCard` | [`a740351`](#commit-a740351) |
| [frontend/src/components/subjects/SyllabusFormModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/subjects/SyllabusFormModal.tsx) | Componente acadêmico SyllabusFormModal: disciplina, cronograma, plano, avaliação ou confirmação correspondente. | `Props`, `SyllabusFormModal` | [`a740351`](#commit-a740351) |
| [frontend/src/components/tasks/TaskEditModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/tasks/TaskEditModal.tsx) | Formulário/edição de Task TaskEditModal, reutilizado nos contextos de tarefa e objetivo de estudo. | Sem definição de topo autônoma; composição, estilo ou template. | [`a08176e`](#commit-a08176e) → [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/components/tasks/TaskFormModal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/tasks/TaskFormModal.tsx) | Formulário/edição de Task TaskFormModal, reutilizado nos contextos de tarefa e objetivo de estudo. | `TaskFormModalProps`, `TaskFormModal` | [`1f8ef7c`](#commit-1f8ef7c) → [`c10cfcb`](#commit-c10cfcb) |
| [frontend/src/components/ui/Badge.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Badge.tsx) | Primitiva do Design System Badge: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `Tone`, `BadgeProps`, `Badge` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/Button.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Button.tsx) | Primitiva do Design System Button: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `Variant`, `Size`, `ButtonProps`, `Button` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/Card.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Card.tsx) | Primitiva do Design System Card: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `CardProps`, `Card` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/Drawer.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Drawer.tsx) | Primitiva do Design System Drawer: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `DrawerProps`, `Drawer` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/EmptyState.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/EmptyState.tsx) | Primitiva do Design System EmptyState: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `EmptyStateProps`, `EmptyState` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/Modal.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Modal.tsx) | Primitiva do Design System Modal: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `ModalProps`, `Modal` | [`eaa8194`](#commit-eaa8194) → [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/components/ui/Pagination.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Pagination.tsx) | Primitiva do Design System Pagination: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `PaginationProps`, `Pagination` | [`5396474`](#commit-5396474) |
| [frontend/src/components/ui/ProgressBar.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/ProgressBar.tsx) | Primitiva do Design System ProgressBar: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `ProgressBarProps`, `ProgressBar` | [`eaa8194`](#commit-eaa8194) → [`de95b44`](#commit-de95b44) |
| [frontend/src/components/ui/SectionHeader.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/SectionHeader.tsx) | Primitiva do Design System SectionHeader: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `SectionHeaderProps`, `SectionHeader` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/Skeleton.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Skeleton.tsx) | Primitiva do Design System Skeleton: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `SkeletonProps`, `Skeleton`, `StatCardSkeleton`, `RowSkeleton` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/Tabs.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Tabs.tsx) | Primitiva do Design System Tabs: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `Tab`, `TabsProps`, `Tabs` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/components/ui/TextField.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/TextField.tsx) | Primitiva do Design System TextField: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `TextFieldProps`, `TextField` | [`eaa8194`](#commit-eaa8194) → [`b03058c`](#commit-b03058c) |
| [frontend/src/components/ui/Tooltip.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/Tooltip.tsx) | Primitiva do Design System Tooltip: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | `TooltipProps`, `Tooltip` | [`eaa8194`](#commit-eaa8194) → [`124b408`](#commit-124b408) |
| [frontend/src/components/ui/index.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/components/ui/index.ts) | Primitiva do Design System index: aparência/estados/interação compartilhados, sem responsabilidade acadêmica. | Sem definição de topo autônoma; composição, estilo ou template. | [`eaa8194`](#commit-eaa8194) |

### Frontend — providers e hooks

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [frontend/src/contexts/AuthContext.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/contexts/AuthContext.tsx) | Token/usuário, cancelamento de /auth/me, login/register/logout e estado de entrada com tema capturado. | `LoginCredentials`, `RegisterData`, `AuthContextType`, `AuthProvider`, `useAuth` | [`18c7bdd`](#commit-18c7bdd) → [`64e4948`](#commit-64e4948) |
| [frontend/src/contexts/BreadcrumbContext.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/contexts/BreadcrumbContext.tsx) | Compartilha rótulos de breadcrumb entre página e cabeçalho. | `BreadcrumbContextType`, `useBreadcrumbContext`, `useBreadcrumbValue`, `useSetBreadcrumb`, `BreadcrumbProvider` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/contexts/ThemeContext.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/contexts/ThemeContext.tsx) | Fonte de tema resolvido, preferência do navegador/conta e ações posteriores de alteração. | `ThemeContextValue`, `useTheme`, `ThemeProvider` | [`1f8ef7c`](#commit-1f8ef7c) → [`64e4948`](#commit-64e4948) |
| [frontend/src/contexts/UserPreferencesContext.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/contexts/UserPreferencesContext.tsx) | Bootstrap do tema de acesso, IO por sessão/dono, pendências e confirmação das gravações. | `PreferencesContextValue`, `UserPreferencesProvider`, `useUserPreferences` | [`ef66fd8`](#commit-ef66fd8) → [`64e4948`](#commit-64e4948) |
| [frontend/src/hooks/useAcademicCapacity.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useAcademicCapacity.ts) | Hook useAcademicCapacity: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useAcademicCapacity` | [`1f8ef7c`](#commit-1f8ef7c) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/hooks/useAcademicRecords.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useAcademicRecords.ts) | Hook useAcademicRecords: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useSubjectResource`, `useSubjectSyllabus`, `useSubjectAssessments` | [`a740351`](#commit-a740351) |
| [frontend/src/hooks/useAnalytics.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useAnalytics.ts) | Hook useAnalytics: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useAnalytics` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/hooks/useAnalyticsPeriod.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useAnalyticsPeriod.ts) | Hook useAnalyticsPeriod: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useAnalyticsPeriod` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/hooks/useCountUp.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useCountUp.ts) | Hook useCountUp: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useCountUp` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/hooks/useDashboard.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useDashboard.ts) | Hook useDashboard: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useDashboard` | [`879c43b`](#commit-879c43b) → [`ebd678e`](#commit-ebd678e) |
| [frontend/src/hooks/useMediaQuery.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useMediaQuery.ts) | Hook useMediaQuery: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useMediaQuery`, `useIsDesktop` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/hooks/useNotes.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useNotes.ts) | Hook useNotes: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useNotes` | [`879c43b`](#commit-879c43b) → [`5396474`](#commit-5396474) |
| [frontend/src/hooks/useStudyPlanner.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/hooks/useStudyPlanner.ts) | Hook useStudyPlanner: coordena carregamento/estado ou adaptação reutilizável para as páginas consumidoras. | `useStudyPlanner` | [`1f8ef7c`](#commit-1f8ef7c) |

### Frontend — regras e utilitários

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [frontend/src/lib/academicRecords.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/academicRecords.ts) | Interpreta rascunhos, nota vazia/zero, vírgula decimal, pesos e limites dos formulários acadêmicos. | `AssessmentDraft`, `createAssessmentDraft`, `decimalNumber`, `AssessmentDraftResult`, `parseAssessmentDraft`, `syllabusFieldError`, `formatGradeNumber` | [`a740351`](#commit-a740351) |
| [frontend/src/lib/advancedAnalytics.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/advancedAnalytics.ts) | Calendário de consistência, intensidade, ações e CSV seguro com período/fuso explícitos. | `reportDateKey`, `consistencyCalendar`, `studyIntensity`, `AnalyticsExport`, `CsvCell`, `csvCell`, `csvRows`, `analyticsCsv`, `analyticsActionLinks`, `analyticsWeekdays` | [`e90f979`](#commit-e90f979) → [`527dab7`](#commit-527dab7) |
| [frontend/src/lib/analytics.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/analytics.ts) | Janelas/datas/fuso, formatação de minutos e capacidade diária válida. | `localDateKey`, `analyticsRange`, `shiftAnalyticsPeriod`, `formatMinutes`, `validDailyCapacity`, `capacityStorageKey`, `readDailyCapacity`, `analyticsTimezone`, `analyticsDateLabel`, `DEFAULT_DAILY_CAPACITY` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/lib/authEntry.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/authEntry.ts) | Reducer transitório de entrada, tema capturado, IDs contra callbacks tardios e deadline da mídia. | `AuthEntryState`, `AuthEntryAction`, `authEntryReducer`, `introPlaybackTimeout`, `initialAuthEntry` | [`2ceb44c`](#commit-2ceb44c) → [`64e4948`](#commit-64e4948) |
| [frontend/src/lib/authRecovery.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/authRecovery.ts) | Lê token de redefinição, remove-o da URL e traduz falhas reais de recuperação. | `readPasswordResetToken`, `redactPasswordResetUrl`, `recoveryErrorMessage` | [`a740351`](#commit-a740351) |
| [frontend/src/lib/calendar.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/calendar.ts) | Grade mensal/semanal/diária, posicionamento/empilhamento e categorias dos compromissos. | `getMonthGrid`, `getWeekDays`, `isSameDay`, `eventsOnDay`, `isOutsideTimeGrid`, `timeToY`, `PositionedEvent`, `layoutDayEvents`, `toDatetimeLocalValue`, `CATEGORY_META`, `WEEKDAY_SHORT`, `GRID_START_HOUR`, `GRID_END_HOUR`, `HOUR_HEIGHT` | [`eaa8194`](#commit-eaa8194) → [`879c43b`](#commit-879c43b) |
| [frontend/src/lib/calendarProjection.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/calendarProjection.ts) | Projeta prazos de Task sem criar eventos persistidos e deduplica por identidade/contexto. | `localDay`, `validDeadline`, `projectCalendarItems`, `calendarItemKey` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/lib/classSchedule.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/classSchedule.ts) | Valida grade letiva, dias/horários, janela, limite de ocorrências e duplicatas. | `ClassScheduleDraft`, `localDateKey`, `parseDate`, `timeMinutes`, `classOccurrenceDates`, `validateClassSchedule`, `buildClassSchedulePayload`, `localDateTimeKey`, `duplicateClassDates`, `scheduleWeek`, `CLASS_WEEKDAYS`, `MAX_CLASS_OCCURRENCES`, `MAX_CLASS_RANGE_DAYS` | [`c10cfcb`](#commit-c10cfcb) |
| [frontend/src/lib/commandSearch.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/commandSearch.ts) | Normalização, tokens, relevância e resultados com contexto para a Command Palette. | `SearchKind`, `CommandSearchResult`, `CommandSearchEntry`, `CommandSearchData`, `noteSearchResults`, `materialSearchResults`, `normalizeSearchText`, `queryTokens`, `matchesCommandQuery`, `excerpt`, `buildCommandSearchIndex`, `searchCommandIndex`, `MAX_SEARCH_QUERY_LENGTH`, `SEARCH_RESULTS_PER_KIND` | [`a740351`](#commit-a740351) → [`5396474`](#commit-5396474) |
| [frontend/src/lib/dashboard.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/dashboard.ts) | Seleciona/ordena prioridades, agenda e prazos exibidos no painel. | `dashboardPriorities`, `dashboardAgenda`, `dashboardDeadlines` | [`879c43b`](#commit-879c43b) |
| [frontend/src/lib/dashboardRecommendation.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/dashboardRecommendation.ts) | Escolhe event/task/plan por regras explícitas de horário, prazo e prioridade. | `TaskRecommendationReason`, `DashboardRecommendation`, `dashboardRecommendation` | [`ebd678e`](#commit-ebd678e) |
| [frontend/src/lib/date.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/date.ts) | Trata datas acadêmicas sem confundir data local com UTC e classifica prazos. | `parseDateOnly`, `startOfToday`, `isPastDue`, `isDueToday`, `daysUntil`, `startOfWeek`, `DueDateStatus`, `getDueDateStatus`, `isThisWeek`, `formatLongDate`, `formatShortDate`, `DUE_DATE_TEXT_CLASS`, `WEEKDAY_LABELS` | [`eaa8194`](#commit-eaa8194) → [`a08176e`](#commit-a08176e) |
| [frontend/src/lib/insights.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/insights.ts) | Converte métricas disponíveis em observações determinísticas para o Dashboard. | `Insight`, `buildDashboardInsights` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/lib/materials.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/materials.ts) | Metadados de categoria/status para renderização consistente de materiais. | `CATEGORY_META`, `MATERIAL_CATEGORIES`, `STATUS_META`, `MATERIAL_STATUSES` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/lib/notes.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/notes.ts) | Tags, validação de conteúdo e resumo de anotações em texto simples. | `parseNoteTags`, `validateNoteInput`, `noteExcerpt` | [`879c43b`](#commit-879c43b) |
| [frontend/src/lib/password.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/password.ts) | Validação compartilhada da senha aceita nos formulários da conta. | `accountPasswordError` | [`a740351`](#commit-a740351) |
| [frontend/src/lib/pomodoro.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/pomodoro.ts) | Máquina de fases, deadline, pausa/retomada/restauração e reconciliação de mutações de sessão. | `PomodoroConfig`, `normalizePomodoroConfig`, `loadPomodoroConfig`, `savePomodoroConfig`, `PomodoroPhase`, `PomodoroTimer`, `remainingTimerMilliseconds`, `createPomodoroTimer`, `pausePomodoroTimer`, `resumePomodoroTimer`, `restorePomodoroTimer`, `loadPomodoroTimer`, `savePomodoroTimer`, `clearPomodoroTimer`, `confirmSessionMutation`, `nextPhase`, `phaseDurationSeconds`, `formatClock`, `formatDuration`, `DEFAULT_POMODORO_CONFIG`, `POMODORO_LIMITS`, `PHASE_LABEL` | [`eaa8194`](#commit-eaa8194) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/lib/studyPlanner.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/studyPlanner.ts) | Filtra objetivos Task, calcula resumo da semana e monta/valida blocos e conflitos. | `GoalFilter`, `GoalSort`, `isStudyGoal`, `upcomingStudyBlocks`, `filterStudyGoals`, `studyWeekSummary`, `formatStudyDuration`, `buildStudyBlock`, `conflictingEvents`, `studyBlockPastDeadline` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/lib/taskForm.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/taskForm.ts) | Contrato Zod e transformação do formulário reutilizado de tarefas/objetivos. | `taskFormSchema`, `TaskFormValues`, `taskFormPayload` | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/lib/tasks.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/tasks.ts) | Metadados e ordenação de prioridades, reutilizados pela interface. | `PRIORITY_META`, `PRIORITY_ORDER` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/lib/theme.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/theme.ts) | Resolve/aplica claro/escuro/sistema e guarda intenção de entrada/proprietário até confirmação. | `ThemePreference`, `ResolvedTheme`, `normalizeThemePreference`, `resolveTheme`, `readThemePreference`, `readStoredTheme`, `readEntryTheme`, `rememberEntryTheme`, `clearEntryTheme`, `readPendingTheme`, `rememberPendingTheme`, `confirmPendingTheme`, `applyTheme`, `THEME_STORAGE_KEY` | [`1f8ef7c`](#commit-1f8ef7c) → [`64e4948`](#commit-64e4948) |
| [frontend/src/lib/userPreferences.ts](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/lib/userPreferences.ts) | Contratos, cache por dono, merge parcial e fila serializada com retry/dispose e transferência de tema. | `UserPreferences`, `PreferencesPatch`, `defaultUserPreferences`, `mergePreferences`, `mergePatches`, `readCachedPreferences`, `cachePreferences`, `PreferencesState`, `PreferencesTransport`, `PreferencesSync` | [`ef66fd8`](#commit-ef66fd8) → [`64e4948`](#commit-64e4948) |

### Frontend — páginas

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [frontend/src/pages/AcademicLoad.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/AcademicLoad.tsx) | Compara agenda e esforço restante com capacidade; sinaliza sobrecarga/lacunas. | `AcademicLoad` | [`b03058c`](#commit-b03058c) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/pages/Calendar.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Calendar.tsx) | Coordena filtros, períodos e visões mês/semana/dia, prazos projetados e eventos editáveis. | `ViewMode`, `periodLabel`, `Calendar` | [`eaa8194`](#commit-eaa8194) → [`c10cfcb`](#commit-c10cfcb) |
| [frontend/src/pages/ComingSoon.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/ComingSoon.tsx) | Placeholder legado; não possui rota montada no App.tsx do corte atual. | `ComingSoon` | [`eaa8194`](#commit-eaa8194) |
| [frontend/src/pages/Dashboard.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Dashboard.tsx) | Compõe próximo passo, agenda/prioridades, prazos, progresso e gráficos semanais. | `greeting`, `Dashboard`, `DashboardSkeleton` | [`18c7bdd`](#commit-18c7bdd) → [`539cc68`](#commit-539cc68) |
| [frontend/src/pages/FocusMode.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/FocusMode.tsx) | Opera timer/Pomodoro e sessões reais, distinguindo planejamento de execução. | `FocusMode` | [`eaa8194`](#commit-eaa8194) → [`ef66fd8`](#commit-ef66fd8) |
| [frontend/src/pages/ForgotPassword.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/ForgotPassword.tsx) | Pede recuperação e distingue 202 genérico de indisponibilidade/erro. | `ForgotPasswordData`, `ForgotPassword` | [`b895823`](#commit-b895823) → [`a740351`](#commit-a740351) |
| [frontend/src/pages/Insights.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Insights.tsx) | Compõe comparação, consistência, padrões, histórico, carga e exportação com tabelas alternativas. | `Insights` | [`b895823`](#commit-b895823) → [`527dab7`](#commit-527dab7) |
| [frontend/src/pages/Login.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Login.tsx) | Acesso em etapas com validação, foco e captura do tema ativo no envio. | `LoginData`, `Login` | [`18c7bdd`](#commit-18c7bdd) → [`64e4948`](#commit-64e4948) |
| [frontend/src/pages/Materials.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Materials.tsx) | Lista paginada, busca/filtros e mutações de referências de estudo. | `StatusTab`, `MaterialFormValues`, `Materials` | [`eaa8194`](#commit-eaa8194) → [`5396474`](#commit-5396474) |
| [frontend/src/pages/Notes.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Notes.tsx) | Lista paginada, pesquisa/contexto e edição de anotações com proteção de rascunho. | `NoteContext`, `Notes` | [`879c43b`](#commit-879c43b) → [`5396474`](#commit-5396474) |
| [frontend/src/pages/Register.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Register.tsx) | Cadastro em etapas, confirmação de senha e transferência do tema escolhido para o login compartilhado. | `RegisterData`, `Register` | [`18c7bdd`](#commit-18c7bdd) → [`64e4948`](#commit-64e4948) |
| [frontend/src/pages/ResetPassword.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/ResetPassword.tsx) | Valida link/senha e efetiva redefinição com feedback e token removido da URL. | `ResetPasswordData`, `ResetPassword` | [`a740351`](#commit-a740351) |
| [frontend/src/pages/Settings.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Settings.tsx) | Aparência e estado de sincronização por conta; explica a continuidade do tema do acesso. | `Settings` | [`879c43b`](#commit-879c43b) → [`64e4948`](#commit-64e4948) |
| [frontend/src/pages/StudyPlanner.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/StudyPlanner.tsx) | Coordena objetivos Task e reservas CalendarEvent com filtros e resumo semanal. | `StudyPlanner` | [`eaa8194`](#commit-eaa8194) → [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/pages/SubjectDetail.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/SubjectDetail.tsx) | Contexto de disciplina: tarefas, progresso, grade, plano e avaliações. | `SubjectDetail` | [`18c7bdd`](#commit-18c7bdd) → [`a740351`](#commit-a740351) |
| [frontend/src/pages/Subjects.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Subjects.tsx) | Lista/progresso e criação/edição/exclusão de disciplinas. | `Subjects` | [`18c7bdd`](#commit-18c7bdd) → [`c10cfcb`](#commit-c10cfcb) |
| [frontend/src/pages/Tasks.tsx](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/pages/Tasks.tsx) | Lista geral, filtros/prioridades e CRUD/status com formulário reutilizado. | `TabKey`, `Tasks` | [`b895823`](#commit-b895823) → [`879c43b`](#commit-879c43b) |

### Frontend — testes de regras

| Arquivo | Responsabilidade / contrato | Símbolos declarados | Origem → última alteração |
|---|---|---|---|
| [frontend/tests/academicRecords.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/academicRecords.test.mjs) | Regressões pelo runner Node de academicRecords; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`a740351`](#commit-a740351) |
| [frontend/tests/advancedAnalytics.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/advancedAnalytics.test.mjs) | Regressões pelo runner Node de advancedAnalytics; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`e90f979`](#commit-e90f979) → [`527dab7`](#commit-527dab7) |
| [frontend/tests/analytics.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/analytics.test.mjs) | Regressões pelo runner Node de analytics; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`879c43b`](#commit-879c43b) |
| [frontend/tests/authEntry.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/authEntry.test.mjs) | Regressões pelo runner Node de authEntry; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`2ceb44c`](#commit-2ceb44c) → [`64e4948`](#commit-64e4948) |
| [frontend/tests/authRecovery.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/authRecovery.test.mjs) | Regressões pelo runner Node de authRecovery; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`a740351`](#commit-a740351) |
| [frontend/tests/calendarProjection.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/calendarProjection.test.mjs) | Regressões pelo runner Node de calendarProjection; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/tests/calendarTimeGrid.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/calendarTimeGrid.test.mjs) | Regressões pelo runner Node de calendarTimeGrid; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`879c43b`](#commit-879c43b) |
| [frontend/tests/classSchedule.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/classSchedule.test.mjs) | Regressões pelo runner Node de classSchedule; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`c10cfcb`](#commit-c10cfcb) |
| [frontend/tests/commandSearch.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/commandSearch.test.mjs) | Regressões pelo runner Node de commandSearch; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`a740351`](#commit-a740351) → [`5396474`](#commit-5396474) |
| [frontend/tests/dashboardRecommendation.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/dashboardRecommendation.test.mjs) | Regressões pelo runner Node de dashboardRecommendation; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`ebd678e`](#commit-ebd678e) |
| [frontend/tests/notes.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/notes.test.mjs) | Regressões pelo runner Node de notes; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`879c43b`](#commit-879c43b) |
| [frontend/tests/pomodoro.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/pomodoro.test.mjs) | Regressões pelo runner Node de pomodoro; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/tests/studyPlanner.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/studyPlanner.test.mjs) | Regressões pelo runner Node de studyPlanner; funções puras/contratos, sem equivaler a QA de navegador. | Casos declarados em `test(...)`; as assertivas permanecem na fonte. | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/tests/theme.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/theme.test.mjs) | Regressões pelo runner Node de theme; funções puras/contratos, sem equivaler a QA de navegador. | `withStorage` | [`879c43b`](#commit-879c43b) → [`64e4948`](#commit-64e4948) |
| [frontend/tests/userPreferences.test.mjs](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tests/userPreferences.test.mjs) | Regressões pelo runner Node de userPreferences; funções puras/contratos, sem equivaler a QA de navegador. | `deferred` | [`ef66fd8`](#commit-ef66fd8) → [`64e4948`](#commit-64e4948) |

### Configuração, documentação e assets complementares

| Arquivo | Papel / limite | Origem → última alteração |
|---|---|---|
| [.gitignore](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/.gitignore) | Ignora ambiente, dados locais, backups e outros artefatos não distribuíveis. | [`18c7bdd`](#commit-18c7bdd) → [`cc96176`](#commit-cc96176) |
| [AGENTS.md](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/AGENTS.md) | Regras de colaboração, validação, preservação de dados e commits incrementais. | [`81e6f86`](#commit-81e6f86) |
| [README.md](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/README.md) | Guia principal do produto, configuração, arquitetura, execução e limites. | [`1de1c28`](#commit-1de1c28) → [`0776ce2`](#commit-0776ce2) |
| [backend/.env.example](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/.env.example) | Campos de configuração de exemplo; credenciais reais ficam no ambiente local. | [`bc0ab44`](#commit-bc0ab44) → [`7773573`](#commit-7773573) |
| [backend/alembic.ini](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic.ini) | Configuração do Alembic; o schema evolui nas revisões versionadas. | [`18c7bdd`](#commit-18c7bdd) |
| [backend/alembic/README](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/README) | Orientação de uso da estrutura Alembic. | [`18c7bdd`](#commit-18c7bdd) → [`879c43b`](#commit-879c43b) |
| [backend/deploy/Caddyfile.example](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/deploy/Caddyfile.example) | Modelo de proxy/HTTPS para o host que vier a ser escolhido; não publicado. | [`7773573`](#commit-7773573) |
| [backend/deploy/edutrack-api.service.example](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/deploy/edutrack-api.service.example) | Modelo de serviço da API; não significa serviço instalado. | [`7773573`](#commit-7773573) |
| [backend/deploy/edutrack-mail.service.example](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/deploy/edutrack-mail.service.example) | Modelo de serviço separado do worker de e-mail; não instalado por este arquivo. | [`7773573`](#commit-7773573) |
| [backend/deploy/logging.json](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/deploy/logging.json) | Configuração de logs operacionais com correlação e sem corpos/segredos. | [`7773573`](#commit-7773573) |
| [backend/pytest.ini](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/pytest.ini) | Configuração da descoberta e execução dos testes backend. | [`eaa8194`](#commit-eaa8194) |
| [backend/requirements.txt](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/requirements.txt) | Dependências Python e restrições de versão da aplicação/testes. | [`18c7bdd`](#commit-18c7bdd) → [`1f8ef7c`](#commit-1f8ef7c) |
| [docs/DEVELOPMENT_STATUS.md](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/docs/DEVELOPMENT_STATUS.md) | Estado de implementação, validações históricas, limites e prioridades recentes. | [`1f8ef7c`](#commit-1f8ef7c) → [`0776ce2`](#commit-0776ce2) |
| [docs/PASSWORD_RECOVERY.md](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/docs/PASSWORD_RECOVERY.md) | Operação de recuperação/worker/produção e instruções de backup/restore. | [`9ac043a`](#commit-9ac043a) → [`82ff78f`](#commit-82ff78f) |
| [frontend/.gitignore](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/.gitignore) | Ignora dependências, build e ambiente local do frontend. | [`18c7bdd`](#commit-18c7bdd) |
| [frontend/package-lock.json](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/package-lock.json) | Lockfile gerado pelo npm; resolução reprodutível, sem nova funcionalidade de domínio. | [`18c7bdd`](#commit-18c7bdd) |
| [frontend/package.json](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/package.json) | Dependências e scripts dev/typecheck/test/build/preview. | [`18c7bdd`](#commit-18c7bdd) → [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/public/favicon.svg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/public/favicon.svg) | Símbolo da marca usado como favicon. | [`18c7bdd`](#commit-18c7bdd) → [`879c43b`](#commit-879c43b) |
| [frontend/public/icons.svg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/public/icons.svg) | Recurso SVG público mantido no repositório; não é rota ou regra de produto. | [`18c7bdd`](#commit-18c7bdd) |
| [frontend/src/assets/brand/README.md](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/brand/README.md) | Procedência, formato real da marca e variantes de logo/vídeo. | [`879c43b`](#commit-879c43b) → [`0776ce2`](#commit-0776ce2) |
| [frontend/src/assets/brand/edutrack-symbol-crimson.png](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/brand/edutrack-symbol-crimson.png) | Variante da marca própria; consultar procedência. Os SVGs incorporam máscara raster, sem alegação de vetor Bézier. | [`879c43b`](#commit-879c43b) |
| [frontend/src/assets/brand/edutrack-symbol-dark-background.png](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/brand/edutrack-symbol-dark-background.png) | Variante da marca própria; consultar procedência. Os SVGs incorporam máscara raster, sem alegação de vetor Bézier. | [`879c43b`](#commit-879c43b) |
| [frontend/src/assets/brand/edutrack-symbol-graphite.png](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/brand/edutrack-symbol-graphite.png) | Variante da marca própria; consultar procedência. Os SVGs incorporam máscara raster, sem alegação de vetor Bézier. | [`879c43b`](#commit-879c43b) |
| [frontend/src/assets/brand/edutrack-symbol-light.svg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/brand/edutrack-symbol-light.svg) | Variante da marca própria; consultar procedência. Os SVGs incorporam máscara raster, sem alegação de vetor Bézier. | [`879c43b`](#commit-879c43b) |
| [frontend/src/assets/brand/edutrack-symbol.svg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/brand/edutrack-symbol.svg) | Variante da marca própria; consultar procedência. Os SVGs incorporam máscara raster, sem alegação de vetor Bézier. | [`879c43b`](#commit-879c43b) |
| [frontend/src/assets/edutrack-logo.jpeg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/edutrack-logo.jpeg) | Referência original de logo preservada; não é a composição tipográfica responsiva da UI. | [`1f8ef7c`](#commit-1f8ef7c) |
| [frontend/src/assets/hero.png](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/hero.png) | Asset visual legado/template preservado. O catálogo registra presença; não presume que seja carregado pela rota atual. | [`18c7bdd`](#commit-18c7bdd) |
| [frontend/src/assets/intro/edutrack-entry-dark-poster.jpg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/intro/edutrack-entry-dark-poster.jpg) | Vídeo de entrada escuro — quadro final usado como poster. | [`03b478f`](#commit-03b478f) |
| [frontend/src/assets/intro/edutrack-entry-dark.mp4](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/intro/edutrack-entry-dark.mp4) | Vídeo de entrada escuro — MP4 H.264/AAC de aproximadamente 10 s; mesma animação nos dois temas. | [`03b478f`](#commit-03b478f) |
| [frontend/src/assets/intro/edutrack-entry-light-poster.jpg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/intro/edutrack-entry-light-poster.jpg) | Vídeo de entrada claro — quadro final usado como poster. | [`03b478f`](#commit-03b478f) |
| [frontend/src/assets/intro/edutrack-entry-light.mp4](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/intro/edutrack-entry-light.mp4) | Vídeo de entrada claro — MP4 H.264/AAC de aproximadamente 10 s; mesma animação nos dois temas. | [`03b478f`](#commit-03b478f) |
| [frontend/src/assets/logo.jpg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/logo.jpg) | Asset visual legado/template preservado. O catálogo registra presença; não presume que seja carregado pela rota atual. | [`b895823`](#commit-b895823) |
| [frontend/src/assets/logo.png](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/logo.png) | Asset visual legado/template preservado. O catálogo registra presença; não presume que seja carregado pela rota atual. | [`a5b800b`](#commit-a5b800b) |
| [frontend/src/assets/typescript.svg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/typescript.svg) | Asset visual legado/template preservado. O catálogo registra presença; não presume que seja carregado pela rota atual. | [`18c7bdd`](#commit-18c7bdd) |
| [frontend/src/assets/vite.svg](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/src/assets/vite.svg) | Asset visual legado/template preservado. O catálogo registra presença; não presume que seja carregado pela rota atual. | [`18c7bdd`](#commit-18c7bdd) |
| [frontend/tsconfig.json](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/frontend/tsconfig.json) | Regras de compilação/tipagem do TypeScript. | [`18c7bdd`](#commit-18c7bdd) → [`b895823`](#commit-b895823) |

<a id="contratos"></a>
## 7. Contratos HTTP e rotas de interface

As 53 operações abaixo foram extraídas dos decorators de `backend/app/api/v1/endpoints` e dos prefixos de `router.py`, sem iniciar a API. Cadastro/login/pedido/redefinição são públicos; `/auth/me` e operações acadêmicas usam autenticação. O Swagger gerado em desenvolvimento detalha parâmetros/schemas; em produção fica desabilitado. Não copiar tokens, senhas ou registros para exemplos.

| Método | Caminho | Handler | Fonte |
|---|---|---|---|
| GET | `/api/v1/subjects/{subject_id}/syllabus` | `read_syllabus` | [backend/app/api/v1/endpoints/academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/academic_records.py) |
| PUT | `/api/v1/subjects/{subject_id}/syllabus` | `update_syllabus` | [backend/app/api/v1/endpoints/academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/academic_records.py) |
| GET | `/api/v1/subjects/{subject_id}/assessments` | `read_assessments` | [backend/app/api/v1/endpoints/academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/academic_records.py) |
| POST | `/api/v1/subjects/{subject_id}/assessments` | `create_assessment` | [backend/app/api/v1/endpoints/academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/academic_records.py) |
| PUT | `/api/v1/subjects/{subject_id}/assessments/{assessment_id}` | `update_assessment` | [backend/app/api/v1/endpoints/academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/academic_records.py) |
| DELETE | `/api/v1/subjects/{subject_id}/assessments/{assessment_id}` | `delete_assessment` | [backend/app/api/v1/endpoints/academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/academic_records.py) |
| GET | `/api/v1/analytics/` | `read_analytics` | [backend/app/api/v1/endpoints/analytics.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/analytics.py) |
| POST | `/api/v1/auth/register` | `register` | [backend/app/api/v1/endpoints/auth.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/auth.py) |
| POST | `/api/v1/auth/login` | `login` | [backend/app/api/v1/endpoints/auth.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/auth.py) |
| GET | `/api/v1/auth/me` | `read_user_me` | [backend/app/api/v1/endpoints/auth.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/auth.py) |
| POST | `/api/v1/auth/forgot-password` | `forgot_password` | [backend/app/api/v1/endpoints/auth.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/auth.py) |
| POST | `/api/v1/auth/reset-password` | `reset_password` | [backend/app/api/v1/endpoints/auth.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/auth.py) |
| GET | `/api/v1/calendar-events/` | `read_calendar_events` | [backend/app/api/v1/endpoints/calendar_events.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/calendar_events.py) |
| POST | `/api/v1/calendar-events/` | `create_calendar_event` | [backend/app/api/v1/endpoints/calendar_events.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/calendar_events.py) |
| PUT | `/api/v1/calendar-events/{event_id}` | `update_calendar_event` | [backend/app/api/v1/endpoints/calendar_events.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/calendar_events.py) |
| DELETE | `/api/v1/calendar-events/series/{recurrence_group_id}` | `delete_calendar_event_series` | [backend/app/api/v1/endpoints/calendar_events.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/calendar_events.py) |
| DELETE | `/api/v1/calendar-events/{event_id}` | `delete_calendar_event` | [backend/app/api/v1/endpoints/calendar_events.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/calendar_events.py) |
| GET | `/api/v1/dashboard/` | `read_dashboard_metrics` | [backend/app/api/v1/endpoints/dashboard.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/dashboard.py) |
| GET | `/api/v1/materials/page` | `read_materials_page` | [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) |
| GET | `/api/v1/materials/` | `read_materials` | [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) |
| GET | `/api/v1/materials/subject/{subject_id}` | `read_materials_by_subject` | [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) |
| POST | `/api/v1/materials/` | `create_material` | [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) |
| PUT | `/api/v1/materials/{material_id}` | `update_material` | [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) |
| PATCH | `/api/v1/materials/{material_id}/status` | `update_material_status` | [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) |
| DELETE | `/api/v1/materials/{material_id}` | `delete_material` | [backend/app/api/v1/endpoints/materials.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/materials.py) |
| GET | `/api/v1/notes/page` | `read_notes_page` | [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) |
| GET | `/api/v1/notes/search` | `search_notes` | [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) |
| GET | `/api/v1/notes/` | `read_notes` | [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) |
| GET | `/api/v1/notes/{note_id}` | `read_note` | [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) |
| POST | `/api/v1/notes/` | `create_note` | [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) |
| PUT | `/api/v1/notes/{note_id}` | `update_note` | [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) |
| DELETE | `/api/v1/notes/{note_id}` | `delete_note` | [backend/app/api/v1/endpoints/notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/notes.py) |
| GET | `/api/v1/study-sessions/active` | `read_active_session` | [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) |
| GET | `/api/v1/study-sessions/` | `read_session_history` | [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) |
| POST | `/api/v1/study-sessions/` | `start_session` | [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) |
| PATCH | `/api/v1/study-sessions/{session_id}/pause` | `pause_session` | [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) |
| PATCH | `/api/v1/study-sessions/{session_id}/resume` | `resume_session` | [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) |
| PATCH | `/api/v1/study-sessions/{session_id}/stop` | `stop_session` | [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) |
| DELETE | `/api/v1/study-sessions/{session_id}` | `delete_session` | [backend/app/api/v1/endpoints/study_sessions.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/study_sessions.py) |
| GET | `/api/v1/subjects/` | `read_subjects` | [backend/app/api/v1/endpoints/subjects.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/subjects.py) |
| POST | `/api/v1/subjects/` | `create_subject` | [backend/app/api/v1/endpoints/subjects.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/subjects.py) |
| GET | `/api/v1/subjects/{subject_id}` | `read_subject` | [backend/app/api/v1/endpoints/subjects.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/subjects.py) |
| PUT | `/api/v1/subjects/{subject_id}` | `update_subject` | [backend/app/api/v1/endpoints/subjects.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/subjects.py) |
| DELETE | `/api/v1/subjects/{subject_id}` | `delete_subject` | [backend/app/api/v1/endpoints/subjects.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/subjects.py) |
| GET | `/api/v1/tasks/` | `read_tasks` | [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) |
| GET | `/api/v1/tasks/subject/{subject_id}` | `read_tasks_by_subject` | [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) |
| POST | `/api/v1/tasks/` | `create_task` | [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) |
| GET | `/api/v1/tasks/{task_id}` | `read_task` | [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) |
| PUT | `/api/v1/tasks/{task_id}` | `update_task` | [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) |
| PATCH | `/api/v1/tasks/{task_id}/status` | `update_task_status` | [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) |
| DELETE | `/api/v1/tasks/{task_id}` | `delete_task` | [backend/app/api/v1/endpoints/tasks.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/tasks.py) |
| GET | `/api/v1/preferences/` | `get_preferences` | [backend/app/api/v1/endpoints/user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/user_preferences.py) |
| PATCH | `/api/v1/preferences/` | `patch_preferences` | [backend/app/api/v1/endpoints/user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/app/api/v1/endpoints/user_preferences.py) |

`GET /health/live` e `GET /health/ready` são definidos em `main.py`, fora do prefixo acadêmico. Live verifica processo; ready verifica banco/schema operacional, sem provar entrega SMTP. Códigos compartilhados incluem 401 para sessão inválida, 404 para recurso inexistente/alheio, 409 para conflito e 422 para validação; a recuperação possui respostas genéricas e indisponibilidade configuracional próprias.

| Rotas do frontend | Função |
|---|---|
| `/login`, `/register` | Acesso em etapas e tema escolhido como origem da nova entrada. |
| `/forgot-password`, `/reset-password` | Pedido e redefinição com feedback real. |
| `/dashboard` | Painel de prioridade, agenda, prazos e progresso. |
| `/subjects`, `/subjects/:id` | Disciplinas e contexto acadêmico detalhado. |
| `/tasks`, `/calendar` | Intenções/prazos e agenda/reservas. |
| `/study`, `/study/focus` | Planejamento e execução do estudo. |
| `/materials`, `/notes` | Referências e conhecimento em texto simples. |
| `/academic-load`, `/insights`, `/settings` | Capacidade/analytics/preferências. |
| `/` e fallback | Encaminham ao Dashboard; PrivateRoute devolve acesso se a sessão não for válida. |

Todas as rotas internas passam por `PrivateRoute` → `DashboardLayout` → `RouteContent`. Login/cadastro bem-sucedidos podem exibir a introdução antes de montar esse shell. `ComingSoon.tsx` permanece no código, mas não é uma rota ativa do App neste corte.

<a id="migrations"></a>
## 8. Cadeia de migrations

A ordem é dada por `down_revision`, não pelo nome alfabético dos arquivos. Presença no Git não prova aplicação em uma instalação específica. Não aplicar migrations nem inspecionar banco real somente para atualizar este documento.

| Revisão | Anterior | Efeito principal | Fonte |
|---|---|---|---|
| `1b7cae50f901` | `base` | Cria o core acadêmico em instalação vazia, reconhecendo estruturas legadas existentes. | [backend/alembic/versions/1b7cae50f901_create_academic_baseline.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/1b7cae50f901_create_academic_baseline.py) |
| `079be52cae26` | `1b7cae50f901` | Ponte para revisão legada do core, sem inventar alterações adicionais de schema. | [backend/alembic/versions/079be52cae26_register_legacy_academic_core.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/079be52cae26_register_legacy_academic_core.py) |
| `96fdd9a96d98` | `079be52cae26` | CalendarEvent e estrutura persistida do calendário. | [backend/alembic/versions/96fdd9a96d98_add_calendar_events_table.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/96fdd9a96d98_add_calendar_events_table.py) |
| `64de913a920e` | `96fdd9a96d98` | Prioridade, estimativa e campos acadêmicos adicionais de Task. | [backend/alembic/versions/64de913a920e_add_task_priority_estimated_hours_and_.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/64de913a920e_add_task_priority_estimated_hours_and_.py) |
| `920618c3f9a9` | `64de913a920e` | StudySession e estados/tempo da execução de estudo. | [backend/alembic/versions/920618c3f9a9_add_study_sessions_table.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/920618c3f9a9_add_study_sessions_table.py) |
| `ebf926553436` | `920618c3f9a9` | Material por disciplina com categoria/status. | [backend/alembic/versions/ebf926553436_add_materials_table.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/ebf926553436_add_materials_table.py) |
| `c218e785d190` | `ebf926553436` | Unicidade de sessão ativa/pausada por usuário; conflito preexistente exige revisão explícita. | [backend/alembic/versions/c218e785d190_enforce_one_active_study_session.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/c218e785d190_enforce_one_active_study_session.py) |
| `d7a42be19c30` | `c218e785d190` | Note e vínculos opcionais de contexto. | [backend/alembic/versions/d7a42be19c30_add_notes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/d7a42be19c30_add_notes.py) |
| `e6f38a91d420` | `d7a42be19c30` | Índice de aulas completas únicas; rejeita duplicatas sem apagá-las. | [backend/alembic/versions/e6f38a91d420_unique_scheduled_classes.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/e6f38a91d420_unique_scheduled_classes.py) |
| `f3a7bf247110` | `e6f38a91d420` | Plano de ensino e avaliações por disciplina. | [backend/alembic/versions/f3a7bf247110_academic_records.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/f3a7bf247110_academic_records.py) |
| `a18e20c4d200` | `f3a7bf247110` | completed_at, TaskStatusEvent e StudySegment; histórico prospectivo. | [backend/alembic/versions/a18e20c4d200_activity_history.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/a18e20c4d200_activity_history.py) |
| `b18e20c4d201` | `a18e20c4d200` | UserPreferences e constraints por proprietário. | [backend/alembic/versions/b18e20c4d201_user_preferences.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/b18e20c4d201_user_preferences.py) |
| `c18e20c4d202` | `b18e20c4d201` | Outbox, rate events e lock compartilhado da recuperação. | [backend/alembic/versions/c18e20c4d202_recovery_outbox_and_limits.py](https://github.com/Vini-cods/EduTrack/blob/0776ce2d84830564d1fee29e5c760ee175657049/backend/alembic/versions/c18e20c4d202_recovery_outbox_and_limits.py) |
<a id="validacoes"></a>
## 9. Validações históricas e auditoria desta edição

Esta tabela consolida marcos documentados; **não soma** recortes focados e suítes integrais. Não presume que o total histórico corresponda à contagem atual de declarações no catálogo. Rodadas de código podem ser comprovadas por documentos publicados em commits posteriores.

| Marco | Evidência registrada | Local / ressalva |
|---|---|---|
| Auditoria inicial de outubro | 78 testes backend aprovados declarados em `crud-validation.md`. | `a08176e`; documento depois consolidado/removido. Registro histórico, não nova execução. |
| Evolução de disciplinas/gráficos em 15/10 | 129 backend/50 frontend e validações de type-check/build/fluxos registradas na rodada. | `81e6f86` e estado associado; conferir o snapshot ao avaliar a cobertura daquela data. |
| Registros acadêmicos e recuperação em 16/10 | 175 backend/71 frontend; type-check/build, migration com backup/preservação e QA em banco isolado. | `9ac043a`; sem SMTP externo. |
| Portal/marca/motion em 17/10 | 71 frontend e build/type-check; foco/etapas/temas e 320/390 px. | `c813e9f`, `3caea48`, `f2ed1c3`; reduced motion/visibilidade também possuem caminhos revisados somente em código. |
| Analytics/Dashboard em 17/10 | 185 backend/84 frontend; build, QA isolado e CSV baixado/conferido. | `66592bc`; recorte 20/20 se sobrepõe à suíte. |
| Layout/navegação em 18/10 | 84 frontend e build; medidas de coluna/sidebar/navegação registradas. | `1988377`; não homologa funções operacionais adicionadas depois. |
| Busca/histórico/preferências/operação em 18/10 | 239 backend/91 frontend; build, SMTP em loopback e ensaios/aplicação local de migrations com preservação. | `82ff78f`; QA visual completo daquela rodada ficou limitado pela disponibilidade do navegador. |
| Introdução inicial em 19/10 | 94 frontend, type-check/build; login/fim/reload, cadastro/controles e temas em base isolada. | `b529bf4`; controles dessa primeira versão foram removidos depois. |
| Vídeo em tela cheia em 19/10 | 10 testes focados e build; variantes em viewport completo, sem botões/controls. | `a032702`; ainda anterior à correção da origem do tema. |
| Tema do início preservado em 19/10 | 30 testes focados e build; claro/escuro contra perfil oposto, Dashboard, reload e troca posterior. | `0776ce2`; rede/storage adversos testados na lógica, sem injeção no navegador. |
| Esta documentação em 24/10 | Auditoria estática de cobertura, links locais, hashes, arquivos e cadeia de migrations. | Não executa aplicação, testes funcionais, migrations, SMTP, backup ou publicação. |

Para reproduzir a validação de uma alteração de código, seguir os comandos e pré-requisitos do README. Mudança exclusiva de documentação exige revisar o diff, cobertura/rastreabilidade e links; repetir builds ou testes antigos não transformaria a descrição histórica em evidência nova daquele commit.

<a id="pendencias"></a>
## 10. Backlog pendente e critérios de conclusão

As prioridades abaixo são recomendações derivadas dos limites do código e do estado registrado, não promessas de implementação nem autorização nova para publicar. O que depende de host, provedor ou regra institucional exige essa decisão antes de execução.

| ID | Prioridade | Estado | Problema / próxima entrega | Critério de conclusão | Dependência |
|---|---|---|---|---|---|
| PEND-01 | Alta | QA pendente | Ampliar conferência integrada de histórico, preferências e busca/paginação com baixa/alta densidade. | Roteiro isolado registra filtros, navegação, loading/erro/vazio, isolamento e regressões; a validação do vídeo não é usada para homologar todas as áreas. | Fixtures e navegadores-alvo. |
| PEND-02 | Alta | Decisão externa | Escolher host, domínio, provedor SMTP e remetente. | Configurações reais definidas e HTTPS, API, worker, entrega externa e monitoramento homologados com autorização de publicação. | Decisão do usuário; preparação atual foi sem publicar. |
| PEND-03 | Alta | Operação pendente | Transformar CLI de backup em rotina operacional. | Agendamento, retenção e cópia externa ativos; restauração ensaiada no host escolhido com evidência de preservação. | Infraestrutura/armazenamento escolhido. |
| PEND-04 | Média | QA pendente | Ampliar acessibilidade e falhas de mídia/rede nas plataformas de uso. | Teclado/foco, leitor de tela, reduced motion, autoplay rejeitado e stall são exercitados em navegadores-alvo, com resultados registrados. | Dispositivos/ambientes de teste. |
| PEND-05 | Média | QA pendente | Ampliar ensaios operacionais de concorrência e recuperação. | Claims/leases, retomada após queda, rate limit compartilhado e transições acadêmicas concorrentes são conferidos no host/banco escolhido. | Ambiente isolado próximo da operação real. |
| PEND-06 | Condicional | Não homologado | Validar SQL Server se for adotado. | Migrations, constraints, cascatas, busca e fluxos acadêmicos aprovados nessa infraestrutura. | Escolha efetiva de MSSQL. |
| PEND-07 | Condicional ao volume | A avaliar | Busca substring pode crescer em custo com o conjunto do proprietário. | Medir volume/latência; adotar índice/full-text somente se houver necessidade demonstrada e contratos preservados. | Métricas e volume real. |
| PEND-08 | Evolução opcional | A definir | Preferências não se atualizam em tempo real entre dispositivos. | Necessidade e contrato definidos; eventual solução preserva última intenção, isolamento e conflitos. | Prioridade de produto. |
| PEND-09 | Evolução de produto | A definir | Média parcial não cobre todas as regras institucionais. | Critérios por instituição definidos/testados sem apresentar inferência como nota oficial. | Regras reais da instituição. |
| PEND-10 | Evolução de produto | A definir | Materials guarda URLs e não uploads. | Necessidade de upload confirmada, escopo de armazenamento/acesso/limites definido antes da implementação. | Problema real de usuário. |
| PEND-11 | Manutenção contínua | Recorrente | Impedir divergência entre backlog, código e documentação. | Cada nova unidade tem commit descritivo, critérios/limites, validações reais e referência ao código; próxima edição avança o corte deste documento. | Novos commits de produto. |

Notes, Materials, Academic Load, Insights/analytics, Settings, histórico prospectivo, busca paginada, preferências e outbox **já estão implementados**. As pendências acima tratam de homologação, operação externa ou evolução deliberada; não devem recriar entidades/fluxos existentes.

### Contrato para registrar o próximo commit

1. Fixar hash, data, mensagem e pais; inspecionar o diff real antes de escrever a entrega.
2. Explicar problema, código/regra alterados e comportamento verificável; listar arquivos intencionais.
3. Separar testes adicionados de testes executados e resultados históricos; indicar ambiente e limitações relevantes.
4. Registrar substituições sem apagar a história e atualizar especificações/catálogo quando o contrato vigente mudar.
5. Acrescentar pendência apenas quando existir trabalho real; preservar dados locais, segredos e alterações do usuário fora do commit.

O histórico é a evidência de evolução, o código é a referência executável e a validação registrada delimita o que foi efetivamente conferido.
