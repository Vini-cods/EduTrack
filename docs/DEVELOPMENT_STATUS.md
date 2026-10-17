# EduTrack — estado de desenvolvimento

Atualizado em 17/10/2026.

## Entrega atual

- Símbolo da logo refinado, aplicado sem nome/slogan à marca, autenticação e favicon, com versões crimson, grafite e para fundo escuro. Imagem original preservada.
- Login e cadastro usam um portal centralizado inspirado na estrutura visual de https://ead.sp.senai.br/: marca no topo, formulário compacto, ajuda de acesso, tema e fundo geométrico em SVG original. A identidade e o símbolo são do EduTrack; os elementos gráficos não carregam recursos externos. Recuperação e redefinição compartilham o mesmo layout.
- Login tem duas etapas: e-mail e senha. Cadastro separa nome/e-mail de senha/confirmação. Avançar valida somente os campos da etapa localmente; a autenticação/criação ocorre no envio final. Voltar preserva valores e posiciona o foco no campo inicial. Validação acessível, Caps Lock no login, confirmação de senha e bloqueio de envios simultâneos foram preservados; mostrar senha mantém alvo de 44 px.
- Recuperação de senha: pedido genérico, SMTP configurável, limite de pedidos e redefinição por link com expiração/finalidade e uso único. As telas distinguem pedido recebido de indisponibilidade/rede; sem SMTP configurado, o serviço retorna 503. Consulte `docs/PASSWORD_RECOVERY.md`.
- Temas claro/escuro/sistema em toda a interface. Preferência local, sincronização entre abas e aplicação antes da renderização.
- Dashboard responde “o que fazer hoje”: tarefas priorizadas, agenda, próximos prazos, progresso, carga semanal e gráficos de estudo agendado/realizado e carga diária.
- Tasks com data aparecem automaticamente no calendário como prazos sem hora, nas visões mês/semana/dia. Edição e exclusão reutilizam o formulário de Task.
- Exclusão de tarefas preserva eventos agendados e histórico de sessões. Excluir ocorrência e excluir série continuam ações distintas no calendário.
- Deduplicação por identidade; uma entrega/prova vinculada à tarefa na mesma data representa o prazo. Blocos diferentes e recorrências legítimas são preservados.
- Calendário recorta eventos que atravessam meia-noite, com intervalo [início, fim), e mantém acessíveis eventos anteriores às 6h.
- Disciplinas possuem criação, edição e exclusão, com professor, carga horária e período letivo. A exclusão confirma consequências e preserva anotações (Notes), sessões e eventos desvinculados.
- Cronograma semanal geral e por disciplina: dias da semana, horário, período, local e prévia de quantidade. Aulas são CalendarEvents recorrentes; calendários semanais aceitam filtros por categoria.
- Plano de ensino por disciplina: objetivos, conteúdo programático e bibliografia em texto simples, com persistência e confirmação ao descartar rascunho.
- Avaliações por disciplina: criação, edição e exclusão de resultados, nota máxima e peso; média parcial normalizada para 0–10 e cobertura dos pesos. Uma nota vazia fica pendente; zero é válido. O prazo é reutilizado da tarefa opcionalmente vinculada.
- Notes implementado: CRUD persistido, busca em título/conteúdo/tags, filtro por disciplina e vínculos com tarefas/sessões. Editor de texto simples com confirmação ao descartar alterações.
- Command Palette pesquisa disciplinas, tarefas, conteúdo/tags de Notes e título/descrição/URL de Materials, ignorando acentos. Resultados possuem contexto e links com destaque/foco; falhas parciais permitem repetir a busca.
- Materials encerra loading em erro, oferece nova tentativa e preserva dados já carregados. Mudanças de status/exclusão só alteram a lista após confirmação da API; envios duplicados são bloqueados.
- Academic Load compara duração da agenda e esforço ainda sem bloco com capacidade diária configurável por usuário neste navegador.
- Insights usa dados reais: estudo planejado/realizado, consistência, entregas, carga por dia e disciplina, tendências semanais e observações determinísticas.
- Gráficos possuem tabelas alternativas; motion respeita prefers-reduced-motion. Páginas carregam por rota, com loading e recuperação de erros.
- Study Planner e Focus anteriores preservados, inclusive separação entre intenção, agenda e execução, timer por deadline e reconciliação de mutações.

## Decisões e limites

O fundo de acesso usa SVG/CSS e deslocamento por ponteiro agendado sob demanda, sem WebGL ou novas dependências. O movimento é desativado por prefers-reduced-motion; o deslocamento também exige ponteiro preciso. A primeira etapa não verifica se o e-mail existe e não adiciona suporte a CPF. Cada etapa remonta seus campos com identidade própria para evitar reutilização de inputs entre nome/e-mail e senha; os valores permanecem no React Hook Form.

Task representa intenção/objetivo; CalendarEvent reserva horário; StudySession registra execução; Note guarda conhecimento. Não há uma segunda entidade copiando prioridade, prazo, estimativa ou disciplina da tarefa.

Prazos no calendário são uma projeção de Task e não criam eventos no banco. A deduplicação não apaga dados existentes por semelhança de título. Recorrência continua materializada por recurrence_group_id.

A carga soma compromissos reais e a estimativa restante ainda não coberta pelo estudo realizado e pelos blocos futuros vinculados. Não soma novamente a estimativa completa de uma tarefa que já possui blocos. Atribui esforço ainda não agendado ao prazo; tarefas sem prazo e sem estimativa são sinalizadas. Consulte a metodologia exibida pela API/tela para o escopo exato do período.

CalendarEvent mantém horários locais sem offset; StudySession e timestamps de Notes usam UTC explícito. Analytics converte sessões para o fuso IANA informado (tzdata no Windows). O tempo ativo concluído é atribuído ao dia de início da sessão: o modelo não guarda segmentos por dia. Conclusão considera o estado atual das tarefas com prazo no período; não existe histórico completed_at. Não são feitas previsões de desempenho ou notas acadêmicas.

Agendar/finalizar sessão não conclui tarefa automaticamente. Ao trocar a disciplina de uma tarefa, planejamento e notas de tarefa acompanham o novo contexto; sessões e notas de sessão preservam o contexto histórico. Notes é texto simples, sem interpretar HTML, anexos ou editor rich text.

Tema, capacidade diária e preferências/estado local Pomodoro não sincronizam entre dispositivos. Na suspensão do navegador, o servidor continua contando estudo até receber uma pausa. A interface não inventa ciclos retroativos.

A média das avaliações usa somente resultados informados, normalizados por nota máxima e ponderados pelo peso. A cobertura informa qual proporção dos pesos possui nota; o resultado não substitui médias oficiais, critérios de aprovação, recuperação ou regras de cada instituição. Excluir/mover uma tarefa desvincula a avaliação e preserva seu resultado na disciplina original; excluir a disciplina remove também seu plano e avaliações, conforme a confirmação exibida.

A Command Palette carrega um snapshot das fontes por abertura/nova tentativa e exibe até 5 resultados por tipo. Os endpoints ainda retornam listas completas; busca paginada no servidor é a próxima melhoria para acervos grandes. Materials guarda referências/URLs, sem upload de arquivos.

Na recuperação, o token é vinculado ao hash atual da senha e a troca usa UPDATE condicional: alterar a senha invalida links anteriores. Tokens de acesso já emitidos continuam válidos até expirar. O envio usa BackgroundTasks sem fila persistente/retry, e o limite de pedidos vive por processo; produção com múltiplos workers exige armazenamento compartilhado e acompanhamento da entrega SMTP. Não foi feito envio externo durante os testes.

## Banco e compatibilidade

Head: f3a7bf247110 (plano de ensino e avaliações), após e6f38a91d420 (unicidade de aulas completas), d7a42be19c30 (Notes) e c218e785d190 (unicidade de sessão ativa).

A migração f3a é aditiva e foi validada no SQLite vazio/legado, em cópia do banco local e depois no original, com backup. SHA256 confirmou os valores de todas as 7 tabelas anteriores preservados; foreign_key_check não apontou erros. SQL Server não foi homologado para as novas tabelas e seus caminhos de cascade. Primeiro salvamento concorrente de um plano retorna 409 em conflito e mantém a versão confirmada.

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

As validações automatizadas usam bancos isolados. Validação integrada em 16/10: 175 testes backend e 71 frontend aprovados; type-check e build de produção aprovados. As migrações reais foram aplicadas após backup e teste em cópia, com SHA256 confirmando os valores anteriores preservados e PRAGMA foreign_key_check sem erros. Durante a evolução, foram realizadas outras 27 verificações HTTP de disciplinas, grade, calendário, carga, duplicatas e preservação.

A homologação acadêmica de 16/10 no navegador utilizou SQLite temporário e portas 8001/5174, separadas do banco real. Nesta entrega foram conferidos: salvamento do plano de ensino, criação de avaliação com nota zero e média parcial recalculada, busca por conteúdo de Notes/Materials com navegação por teclado e destaque do resultado, tema escuro e formulário de avaliação sem transbordamento horizontal em 320/390 px. Com a API de teste desligada, Materials encerrou o carregamento e exibiu erro/nova tentativa. Recuperação sem SMTP exibiu indisponibilidade real; link de redefinição sem token orientou a pedir outro. Não foram alteradas credenciais reais nem enviado e-mail externo.

O portal de acesso recebeu validação adicional em 17/10: 71 testes frontend, type-check e build de produção aprovados. No navegador foram conferidos: e-mail inválido impedindo avanço, Enter e foco entre etapas, retorno preservando nome/e-mail, mostrar/ocultar senha no login, erro de credenciais inválidas, validação de senha no cadastro, ajuda com Escape e restauração de foco, temas claro/escuro e ausência de transbordamento horizontal em 320/390 px. A recuperação manteve o layout compartilhado. Reduced motion foi revisado no CSS e no guard do ponteiro; a preferência do sistema não foi alterada. Não foram criadas contas, alteradas credenciais, enviadas mensagens externas ou modificadas APIs/banco nesta etapa. As verificações do login usaram dados sintéticos inválidos no serviço local.

## Próximas evoluções

Prioridades confirmadas pelo código:

1. Configurar o provedor SMTP local/produção e homologar entrega real; adicionar fila/retry e rate limit compartilhado antes de escalar workers.
2. Sincronizar preferências entre dispositivos e evoluir o histórico temporal de estudo/conclusões.
3. Adicionar busca paginada no servidor para Notes/Materials e decidir o armazenamento de uploads, se necessário ao produto.
4. Evoluir regras de avaliações por instituição sem apresentar a média parcial como resultado oficial.
5. Ampliar QA visual/acessibilidade, validação de concorrência e preparação para produção. A validação atual do banco se concentra em SQLite.

Materials já existe; Notes, Academic Load, analytics e Settings de aparência deixaram de ser placeholders. Limitações de analytics e cronograma estão descritas acima.

## Commits incrementais

O fluxo está registrado em `AGENTS.md`: concluir e validar uma unidade coerente, revisar o diff e fazer um commit descritivo por assunto. Funcionalidades, correções independentes e documentação devem ser separadas. Push depende de solicitação explícita.

O SQLite local deixou de ser rastreado; o arquivo e seus dados permanecem no ambiente de trabalho. Instalações novas usam as migrations, conforme o guia de execução.
