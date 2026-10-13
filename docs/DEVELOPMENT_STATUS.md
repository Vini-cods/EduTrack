# EduTrack — estado de desenvolvimento

Atualizado em 12/10/2026, a partir do código existente.

## Entrega atual: Study Planner e confiabilidade do Focus

- Objetivos reutilizam Task: título, conteúdo, disciplina, prazo, prioridade, status e estimativa.
- Criação e edição compartilham formulário e validação; objetivos exigem estimativa positiva.
- Filtros por disciplina, situação, semana, atraso e ausência de próximos blocos.
- Um objetivo pode ter vários blocos de estudo, com duração independente da estimativa total.
- A agenda avisa sobre sobreposições e blocos posteriores ao prazo.
- Resumo semanal distingue estimativa dos objetivos, duração reservada e sessões concluídas.
- Próximos blocos consideram apenas estudos futuros/em curso, em ordem cronológica.
- Falhas de carregamento oferecem retry; atualizações preservam o último retrato disponível.
- Modais têm foco inicial, contenção de Tab, restauração do foco e rolagem em viewport pequena.
- Focus usa deadline para evitar drift, recupera fase/ciclos/pausa localmente e confirma mutações na API.
- O banco garante uma sessão em andamento/pausada por usuário; validações mantêm isolamento e contexto acadêmico.
- Recorrência continua materializada por `recurrence_group_id`.

## Decisões e limites

Task representa o objetivo/intenção, CalendarEvent representa a reserva de horário e StudySession representa a execução. Não foi criada uma entidade StudyPlan duplicando dados de Task. No escopo atual, toda tarefa com estimativa positiva aparece no Planner; distinguir tipos de tarefa pode ser uma evolução futura com necessidade concreta.

Agendar ou finalizar uma sessão não conclui automaticamente uma tarefa. Ao trocar a disciplina de uma tarefa, seus eventos planejados acompanham a mudança; sessões mantêm o contexto registrado ao iniciar.

O calendário usa horários locais sem offset, preservando o contrato existente. StudySession usa UTC explícito. A duração realizada de uma sessão concluída é atribuída à semana de início: o modelo atual não guarda segmentos por dia. Na suspensão/fechamento do navegador, o servidor continua contando estudo até receber uma pausa; a interface não inventa ciclos retroativos. Fase e preferências Pomodoro são locais ao navegador, não sincronizadas entre dispositivos.

## Executar validações

No diretório `frontend` (Node 22.16+):

```powershell
npm run typecheck
npm test
npm run build
```

No diretório `backend`, com o ambiente Python ativado:

```powershell
python -m pytest -q
python -m alembic upgrade head
```

Os testes usam bancos isolados. Faça backup antes de atualizar um banco de uso real. A migração `c218e785d190` adiciona o índice de unicidade de sessão ativa e preserva os registros existentes; sessões ativas duplicadas devem ser resolvidas explicitamente antes de aplicar o índice.

## Próximas etapas do produto

Já existem implementação de Materials e Insights visual, além de Tasks, Subjects, Dashboard, autenticação e calendário. Isso é mais avançado que o resumo original enviado para continuação.

Ainda precisam de etapa própria: Notes (rota placeholder), Academic Load, priorização determinística mais completa, syllabus, analytics de estudo integrados ao Dashboard/Insights e ampliação da Command Palette. Settings também permanece placeholder. O Dashboard ainda se apoia em tarefas, sem uma agenda acadêmica unificada. O aviso de bundle grande do Vite exige futura divisão por rotas/gráficos; esta entrega não adiciona dependências de animação ou gráficos.
