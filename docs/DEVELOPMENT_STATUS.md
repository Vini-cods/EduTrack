# EduTrack — estado de desenvolvimento

Atualizado em 13/10/2026.

## Entrega atual

- Logo original enviada pelo usuário aplicada à marca, autenticação e favicon, sem alterar o arquivo de imagem.
- Login e cadastro compartilham layout; validação acessível, confirmação de senha e proteção contra envios simultâneos.
- Temas claro/escuro/sistema em toda a interface. Preferência local, sincronização entre abas e aplicação antes da renderização.
- Dashboard responde “o que fazer hoje”: tarefas priorizadas, agenda, próximos prazos, progresso e carga semanal.
- Tasks com data aparecem automaticamente no calendário como prazos sem hora, nas visões mês/semana/dia. Edição e exclusão reutilizam o formulário de Task.
- Exclusão de tarefas preserva eventos agendados e histórico de sessões. Excluir ocorrência e excluir série continuam ações distintas no calendário.
- Deduplicação por identidade; uma entrega/prova vinculada à tarefa na mesma data representa o prazo. Blocos diferentes e recorrências legítimas são preservados.
- Calendário recorta eventos que atravessam meia-noite, com intervalo [início, fim), e mantém acessíveis eventos anteriores às 6h.
- Notes implementado: CRUD persistido, busca em título/conteúdo/tags, filtro por disciplina e vínculos com tarefas/sessões. Editor de texto simples com confirmação ao descartar alterações.
- Academic Load compara duração da agenda e esforço ainda sem bloco com capacidade diária configurável por usuário neste navegador.
- Insights usa dados reais: estudo planejado/realizado, consistência, entregas, carga por dia e disciplina, tendências semanais e observações determinísticas.
- Gráficos possuem tabelas alternativas; motion respeita prefers-reduced-motion. Páginas carregam por rota, com loading e recuperação de erros.
- Study Planner e Focus anteriores preservados, inclusive separação entre intenção, agenda e execução, timer por deadline e reconciliação de mutações.

## Decisões e limites

Task representa intenção/objetivo; CalendarEvent reserva horário; StudySession registra execução; Note guarda conhecimento. Não há uma segunda entidade copiando prioridade, prazo, estimativa ou disciplina da tarefa.

Prazos no calendário são uma projeção de Task e não criam eventos no banco. A deduplicação não apaga dados existentes por semelhança de título. Recorrência continua materializada por recurrence_group_id.

A carga soma compromissos reais e a estimativa restante ainda não coberta pelo estudo realizado e pelos blocos futuros vinculados. Não soma novamente a estimativa completa de uma tarefa que já possui blocos. Atribui esforço ainda não agendado ao prazo; tarefas sem prazo e sem estimativa são sinalizadas. Consulte a metodologia exibida pela API/tela para o escopo exato do período.

CalendarEvent mantém horários locais sem offset; StudySession e timestamps de Notes usam UTC explícito. Analytics converte sessões para o fuso IANA informado (tzdata no Windows). O tempo ativo concluído é atribuído ao dia de início da sessão: o modelo não guarda segmentos por dia. Conclusão considera o estado atual das tarefas com prazo no período; não existe histórico completed_at. Não são feitas previsões de desempenho ou notas acadêmicas.

Agendar/finalizar sessão não conclui tarefa automaticamente. Ao trocar a disciplina de uma tarefa, planejamento e notas de tarefa acompanham o novo contexto; sessões e notas de sessão preservam o contexto histórico. Notes é texto simples, sem interpretar HTML, anexos ou editor rich text.

Tema, capacidade diária e preferências/estado local Pomodoro não sincronizam entre dispositivos. Na suspensão do navegador, o servidor continua contando estudo até receber uma pausa. A interface não inventa ciclos retroativos.

## Banco e compatibilidade

Head: d7a42be19c30 (Notes), após c218e785d190 (unicidade de sessão ativa).

A revisão legada 079be52cae26 é mantida na cadeia como ponte sem alterações de schema. Bancos antigos já possuem users/subjects/tasks e seguem normalmente para o calendário e demais tabelas. A revisão 1b7cae50f901 cria esse core em instalações vazias. Não é necessário alterar manualmente alembic_version ou apagar dados.

Faça backup antes de atualizar um banco de uso real. Backups locais ficam em backend/.backups, fora do versionamento. Bancos com sessões ativas duplicadas precisam resolver as sessões extras explicitamente antes da migração c218.

## Validação e execução

Frontend, no diretório frontend (Node 22.16+):

```powershell
npm run typecheck
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Backend, no diretório backend:

```powershell
.\venv\Scripts\python.exe -m pytest -q
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

As validações automatizadas usam bancos isolados. A homologação HTTP desta entrega utiliza SQLite temporário e portas 8001/5174, separadas do banco real. O resultado final dos testes e da revisão no navegador é registrado ao concluir a integração.

## Próximas evoluções

Syllabus, expansão de busca da Command Palette, sincronização de preferências e histórico temporal mais detalhado de estudo/conclusões continuam oportunidades futuras. Materials já existe; Notes, Academic Load, analytics e Settings de aparência deixaram de ser placeholders.
