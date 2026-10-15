# EduTrack — estado de desenvolvimento

Atualizado em 15/10/2026.

## Entrega atual

- Símbolo da logo refinado, aplicado sem nome/slogan à marca, autenticação e favicon, com versões crimson, grafite e para fundo escuro. Imagem original preservada.
- Login e cadastro compartilham uma experiência editorial com prévia interativa Organizar/Focar/Evoluir, navegação por teclado e SVG motion discreto. O formulário aparece primeiro em telas menores; a prévia é explicitamente ilustrativa e não acessa dados acadêmicos.
- Autenticação mantém validação acessível, confirmação de senha e proteção contra envios simultâneos. Login valida após interação, avisa sobre Caps Lock e mantém foco no primeiro campo inválido. Botões de mostrar senha possuem alvo de 44 px.
- Temas claro/escuro/sistema em toda a interface. Preferência local, sincronização entre abas e aplicação antes da renderização.
- Dashboard responde “o que fazer hoje”: tarefas priorizadas, agenda, próximos prazos, progresso, carga semanal e gráficos de estudo agendado/realizado e carga diária.
- Tasks com data aparecem automaticamente no calendário como prazos sem hora, nas visões mês/semana/dia. Edição e exclusão reutilizam o formulário de Task.
- Exclusão de tarefas preserva eventos agendados e histórico de sessões. Excluir ocorrência e excluir série continuam ações distintas no calendário.
- Deduplicação por identidade; uma entrega/prova vinculada à tarefa na mesma data representa o prazo. Blocos diferentes e recorrências legítimas são preservados.
- Calendário recorta eventos que atravessam meia-noite, com intervalo [início, fim), e mantém acessíveis eventos anteriores às 6h.
- Disciplinas possuem criação, edição e exclusão, com professor, carga horária e período letivo. A exclusão confirma consequências e preserva notas, sessões e eventos desvinculados.
- Cronograma semanal geral e por disciplina: dias da semana, horário, período, local e prévia de quantidade. Aulas são CalendarEvents recorrentes; calendários semanais aceitam filtros por categoria.
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

Head: e6f38a91d420 (unicidade de aulas completas por usuário/disciplina/intervalo), após d7a42be19c30 (Notes) e c218e785d190 (unicidade de sessão ativa).

A revisão legada 079be52cae26 é mantida na cadeia como ponte sem alterações de schema. Bancos antigos já possuem users/subjects/tasks e seguem normalmente para o calendário e demais tabelas. A revisão 1b7cae50f901 cria esse core em instalações vazias. Não é necessário alterar manualmente alembic_version ou apagar dados.

A revisão e6f também detecta aulas completas duplicadas antes de criar o índice e interrompe sem excluir dados. Criações concorrentes recebem 409 com rollback da série inteira.

No cronograma, editar altera uma ocorrência; para substituir a grade inteira, exclua a série e cadastre outra. Feriados são ajustados manualmente. Cada grade permite até 260 ocorrências em uma janela de até 366 dias; aulas atravessando meia-noite precisam de dois blocos no formulário de grade.

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

As validações automatizadas usam bancos isolados. A homologação HTTP desta entrega utiliza SQLite temporário e portas 8001/5174, separadas do banco real. Validação final: 129 testes backend e 50 frontend aprovados; type-check e build de produção aprovados. Smoke HTTP real em banco temporário: 27 verificações de disciplinas, grade, calendário, carga, duplicatas e preservação; outras verificações de Notes/calendário foram realizadas durante a integração. As migrações reais foram aplicadas após backup e teste em cópia, com SHA256 confirmando todos os valores anteriores preservados e PRAGMA foreign_key_check sem erros. Login, Dashboard inicial, temas e criação de Notes foram conferidos no navegador; a inspeção visual final da nova grade e dos gráficos ficou limitada por falha de conexão da prévia interna.

A experiência de entrada recebeu uma validação adicional em 15/10: 50 testes frontend, type-check e build de produção aprovados. Login/cadastro e prévia foram conferidos no navegador, incluindo troca de tema, setas nas abas, mensagens de validação e ausência de transbordamento horizontal em larguras de 320, 390 e 768 px. Reduced motion foi revisado no CSS; a preferência do sistema não foi alterada. Nenhuma API de autenticação foi modificada nesta etapa.

## Próximas evoluções

Prioridades confirmadas pelo código:

1. Fechar recuperação real de senha: o backend ainda não envia e-mail e falta formulário/rota frontend de redefinição. A tela de recuperação também precisa distinguir falha de rede de solicitação recebida.
2. Evoluir syllabus e avaliações/notas acadêmicas. Notes hoje significa anotações em texto, não notas de provas ou médias.
3. Ampliar busca da Command Palette para Notes e Materials; hoje pesquisa disciplinas e tarefas.
4. Melhorar tratamento de falha em Materials, que pode manter o estado de carregamento. Materiais são referências/URLs; upload não está implementado.
5. Revisar sincronização de preferências, histórico temporal de estudo/conclusões, QA visual e preparação para produção.

Materials já existe; Notes, Academic Load, analytics e Settings de aparência deixaram de ser placeholders. Limitações de analytics e cronograma estão descritas acima.

## Commits incrementais

O fluxo está registrado em `AGENTS.md`: concluir e validar uma unidade coerente, revisar o diff e fazer um commit descritivo por assunto. Funcionalidades, correções independentes e documentação devem ser separadas. Push depende de solicitação explícita.

O SQLite local deixou de ser rastreado; o arquivo e seus dados permanecem no ambiente de trabalho. Instalações novas usam as migrations, conforme o guia de execução.
