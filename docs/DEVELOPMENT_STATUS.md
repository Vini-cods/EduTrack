# EduTrack — estado de desenvolvimento

Atualizado em 18/10/2026.

## Entrega atual

- Ajustes de interface em 18/10: sidebar compacta, links com altura mínima de 44 px e rolagem local. O item ativo permanece visível ao navegar, recolher o menu ou redimensionar a janela, com acompanhamento por ResizeObserver; cabeçalho e rodapé não encolhem e a altura segue o viewport dinâmico (dvh). Tooltips aceitam className para os alvos do menu recolhido, preservando title como alternativa.
- Controles de Analytics agrupam setas e intervalo em um grid coeso; Hoje permanece independente e os botões mantêm alvo de 44 px. A navegação Semana/Mês preserva as regras de período existentes e permite que datas longas quebrem em duas linhas no celular.
- Sete cards simples do Dashboard usam uma coluna no mobile e duas a partir de xl, com CSS columns e break-inside-avoid para reduzir espaços vazios. A ordem do DOM e do teclado desce a primeira coluna e depois a segunda. Gráficos Recharts permanecem fora desse agrupamento para preservar seu tamanho e leitura integral. O CTA duplicado de Insights foi removido; “Explorar Insights” permanece junto aos gráficos. O diagnóstico compacto dispõe suas duas métricas lado a lado quando houver espaço.
- Símbolo da logo refinado, aplicado sem nome/slogan à interface interna e favicon, com versões crimson, grafite e para fundo escuro. Na entrada, a composição completa reúne símbolo, EDUTRACK e slogan, em crimson no claro e off-white no escuro; reutiliza a silhueta existente e texto nítido da interface. Imagem original preservada.
- Login e cadastro usam um portal centralizado inspirado na estrutura visual de https://ead.sp.senai.br/: marca completa centralizada acima do formulário compacto, ajuda de acesso, tema, geometria SVG original e rede de partículas em Canvas 2D. A identidade e o símbolo são do EduTrack; os elementos gráficos não carregam recursos externos. Recuperação e redefinição compartilham o mesmo layout.
- Login tem duas etapas: e-mail e senha. Cadastro separa nome/e-mail de senha/confirmação. Avançar valida somente os campos da etapa localmente; a autenticação/criação ocorre no envio final. Voltar preserva valores e posiciona o foco no campo inicial. Validação acessível, Caps Lock no login, confirmação de senha e bloqueio de envios simultâneos foram preservados; mostrar senha mantém alvo de 44 px.
- Recuperação de senha: pedido genérico, SMTP configurável, limite de pedidos e redefinição por link com expiração/finalidade e uso único. As telas distinguem pedido recebido de indisponibilidade/rede; sem SMTP configurado, o serviço retorna 503. Consulte `docs/PASSWORD_RECOVERY.md`.
- Temas claro/escuro/sistema em toda a interface. Preferência local, sincronização entre abas e aplicação antes da renderização.
- Dashboard responde “o que fazer hoje”: próximo passo explicado por compromisso em andamento, início nos próximos 30 minutos ou tarefa prioritária; agenda, prazos distribuídos na semana, progresso e gráficos de estudo/carga. Inclui comparação do estudo com o intervalo anterior, diagnóstico de planejamento e atualização conjunta dos dados pelo botão de recarregar.
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
- Insights usa dados reais: comparação com trecho equivalente do período anterior, calendário de consistência, sequências limitadas ao período, duração média/mediana e distribuições por dia/horário de início das sessões. Mantém estudo planejado/realizado, entregas, carga por disciplina e observações determinísticas com ações para os fluxos correspondentes.
- Diagnóstico de planejamento informa cobertura do esforço restante, dias acima da capacidade, excesso acumulado, pico e lacunas de estimativa/prazo. CSV local exporta dados diários, por disciplina ou comparação, com fuso e intervalos explícitos e proteção contra interpretação de texto do usuário como fórmula.
- O resumo de tarefas/disciplinas do backend agora é agregado em uma única consulta, preservando disciplinas vazias e isolamento por proprietário. Analytics mantém cálculos puros separados do carregamento dos dados e contratos adicionais de comparação, padrões e diagnóstico.
- Gráficos possuem tabelas alternativas; motion respeita prefers-reduced-motion. Páginas carregam por rota, com loading e recuperação de erros.
- Study Planner e Focus anteriores preservados, inclusive separação entre intenção, agenda e execução, timer por deadline e reconciliação de mutações.
- README consolidado como referência principal de produto, execução, configuração, migrations, arquitetura, validação e limites. Sete documentos redundantes/obsoletos da raiz foram removidos; permanecem as instruções de trabalho, este estado de desenvolvimento, o guia operacional de recuperação e a procedência dos arquivos da marca.

## Decisões e limites

O fundo de acesso combina os cubos SVG existentes com uma rede Canvas 2D isolada. Partículas flutuam lentamente e recebem conexões por proximidade, com opacidade gradual. As cores atuais são crimson #c81e3e no claro e #ff6278 no escuro, com opacidade máxima de 0,78 nas linhas e 0,96 nos pontos. A densidade acompanha o viewport: 18 partículas no celular e 24–36 no desktop, DPR de até 1,5 e desenho limitado a 30 fps. O loop não usa estado React por quadro, pausa em aba oculta e mantém um quadro estático em prefers-reduced-motion. A troca de tema redesenha a cor sem reiniciar a rede; resize mantém posições proporcionais. Não há WebGL ou novas dependências.

A logo completa pertence apenas a AuthLayout; a marca das páginas internas mantém somente o símbolo. O deslocamento do fundo por ponteiro exige ponteiro preciso e respeita reduced motion. A primeira etapa não verifica se o e-mail existe e não adiciona suporte a CPF. Cada etapa remonta seus campos com identidade própria para evitar reutilização de inputs entre nome/e-mail e senha; os valores permanecem no React Hook Form.

Task representa intenção/objetivo; CalendarEvent reserva horário; StudySession registra execução; Note guarda conhecimento. Não há uma segunda entidade copiando prioridade, prazo, estimativa ou disciplina da tarefa.

Prazos no calendário são uma projeção de Task e não criam eventos no banco. A deduplicação não apaga dados existentes por semelhança de título. Recorrência continua materializada por recurrence_group_id.

A carga soma compromissos reais e a estimativa restante ainda não coberta pelo estudo realizado e pelos blocos futuros vinculados. Não soma novamente a estimativa completa de uma tarefa que já possui blocos. Atribui esforço ainda não agendado ao prazo; tarefas sem prazo e sem estimativa são sinalizadas. Consulte a metodologia exibida pela API/tela para o escopo exato do período.

A cobertura de planejamento considera tarefas abertas estimadas cujo esforço é distribuído no período, incluindo atrasos atribuídos a hoje. Desconta estudo já concluído e limita a cobertura futura ao esforço restante de cada tarefa. Blocos futuros vinculados podem estar fora da janela selecionada e depois do prazo; cobertura não garante que a tarefa caiba antes da entrega. Sem esforço restante estimado, a proporção fica indisponível. As lacunas de prazo/estimativa contam todo o backlog aberto, inclusive fora da janela.

CalendarEvent mantém horários locais sem offset; StudySession e timestamps de Notes usam UTC explícito. Analytics converte sessões para o fuso IANA informado (tzdata no Windows). O tempo ativo concluído é atribuído ao dia de início da sessão: o modelo não guarda segmentos por dia. Conclusão considera o estado atual das tarefas com prazo no período; não existe histórico completed_at. Não são feitas previsões de desempenho ou notas acadêmicas.

A comparação de estudo usa a mesma quantidade de dias transcorridos em cada trecho; o trecho anterior começa uma janela selecionada antes. O dia atual, quando incluído, é parcial e os dias do trecho anterior são completos, conforme informado na interface. Não há comparação percentual quando a base anterior é zero, nem comparação disponível para uma janela inteiramente futura. Sessões com início ou término no futuro são desconsideradas como execução real.

Consistência exclui dias futuros do denominador. Sequências atual e máxima ficam limitadas à janela selecionada; se hoje ainda não teve estudo, a sequência atual pode terminar ontem. Média, mediana, maior sessão e distribuições por horário/dia usam sessões concluídas e seu início local; indicam padrões registrados, sem medir eficiência ou recomendar um horário ideal de aprendizagem.

A exportação CSV usa os dados já carregados no navegador, sem envio externo. O arquivo é UTF-8 com BOM, separador ponto e vírgula, aspas escapadas e neutralização de prefixos de fórmula em textos do usuário. Exportação de comparação fica indisponível sem trecho comparável. O CSV não acrescenta um histórico de conclusões que o modelo não possui.

O próximo passo do Dashboard segue regras explícitas: compromisso em andamento, compromisso nos próximos 30 minutos e depois a ordenação existente de tarefas abertas. Sem tarefa, pode destacar o próximo compromisso ou orientar o planejamento. Isso não é uma previsão por IA nem muda prioridade, prazo ou estado automaticamente. O resumo agregado do endpoint de Dashboard executa uma consulta; a página também busca tarefas, agenda e analytics para suas seções.

Agendar/finalizar sessão não conclui tarefa automaticamente. Ao trocar a disciplina de uma tarefa, planejamento e notas de tarefa acompanham o novo contexto; sessões e notas de sessão preservam o contexto histórico. Notes é texto simples, sem interpretar HTML, anexos ou editor rich text.

Tema, capacidade diária e preferências/estado local Pomodoro não sincronizam entre dispositivos. Na suspensão do navegador, o servidor continua contando estudo até receber uma pausa. A interface não inventa ciclos retroativos.

A média das avaliações usa somente resultados informados, normalizados por nota máxima e ponderados pelo peso. A cobertura informa qual proporção dos pesos possui nota; o resultado não substitui médias oficiais, critérios de aprovação, recuperação ou regras de cada instituição. Excluir/mover uma tarefa desvincula a avaliação e preserva seu resultado na disciplina original; excluir a disciplina remove também seu plano e avaliações, conforme a confirmação exibida.

A Command Palette carrega um snapshot das fontes por abertura/nova tentativa e exibe até 5 resultados por tipo. Os endpoints ainda retornam listas completas; busca paginada no servidor é a próxima melhoria para acervos grandes. Materials guarda referências/URLs, sem upload de arquivos.

Na recuperação, o token é vinculado ao hash atual da senha e a troca usa UPDATE condicional: alterar a senha invalida links anteriores. Tokens de acesso já emitidos continuam válidos até expirar. O envio usa BackgroundTasks sem fila persistente/retry, e o limite de pedidos vive por processo; produção com múltiplos workers exige armazenamento compartilhado e acompanhamento da entrega SMTP. Não foi feito envio externo durante os testes.

## Banco e compatibilidade

Head: f3a7bf247110 (plano de ensino e avaliações), após e6f38a91d420 (unicidade de aulas completas), d7a42be19c30 (Notes) e c218e785d190 (unicidade de sessão ativa).

A evolução atual de Insights/Dashboard e o refinamento das partículas não alteram models ou migrations. Não há atualização de schema nem mudança exigida nos dados existentes nesta etapa.

A migração f3a é aditiva e foi validada no SQLite vazio/legado, em cópia do banco local e depois no original, com backup. SHA256 confirmou os valores de todas as 7 tabelas anteriores preservados; foreign_key_check não apontou erros. SQL Server não foi homologado para as novas tabelas e seus caminhos de cascade. Primeiro salvamento concorrente de um plano retorna 409 em conflito e mantém a versão confirmada.

A revisão legada 079be52cae26 é mantida na cadeia como ponte sem alterações de schema. Bancos antigos já possuem users/subjects/tasks e seguem normalmente para o calendário e demais tabelas. A revisão 1b7cae50f901 cria esse core em instalações vazias. Não é necessário alterar manualmente alembic_version ou apagar dados.

A revisão e6f também detecta aulas completas duplicadas antes de criar o índice e interrompe sem excluir dados. Criações concorrentes recebem 409 com rollback da série inteira.

No cronograma, editar altera uma ocorrência; para substituir a grade inteira, exclua a série e cadastre outra. Feriados são ajustados manualmente. Cada grade permite até 260 ocorrências em uma janela de até 366 dias; aulas atravessando meia-noite precisam de dois blocos no formulário de grade.

Faça backup antes de atualizar um banco de uso real. Backups locais ficam em backend/.backups, fora do versionamento. Bancos com sessões ativas duplicadas precisam resolver as sessões extras explicitamente antes da migração c218.

## Validação e execução

Rodada de interface de 18/10: 84/84 testes frontend aprovados. O build final, já incluindo ResizeObserver e CSS columns, terminou com código 0 em `npm run build` (`tsc && vite build`): TypeScript aprovado, 2.672 módulos transformados e etapa Vite concluída em 1 min 39 s. Não houve alteração de API, models, migrations, banco real ou dependências, e a suíte backend não foi repetida para esta correção de UI.

QA confirmado em 18/10 com um Dashboard de baixa densidade (uma tarefa), em 1280 × 720: a diferença entre o fim das duas colunas caiu de 200,75 px na primeira tentativa para 21,25 px após CSS columns, sem transbordamento horizontal. O link Insights ficou inteiramente visível na sidebar expandida com altura de 720 px. Após recolher e redimensionar de 720 para 600 px, o item ativo ocupou y=447–491 dentro da área de navegação y=148–491; o alvo mediu 51 × 44 px.

Insights no tema escuro foi conferido em 320 px, com viewport e página de 312 px úteis, sem transbordamento horizontal. As setas anterior/próxima permaneceram alinhadas em y=347, ambas com 44 × 44 px. A faixa de datas ocupou duas linhas e 38,5 px de altura; a navegação mensal funcionou. Esta rodada ainda não registra QA de uma agenda cheia; os resultados acima se limitam aos cenários explicitamente conferidos.

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

O refinamento visual de 17/10 adicionou marca completa e animação das conexões. Type-check e build de produção aprovados; navegação da marca por teclado, contraste nos dois temas, cadastro em 320 px e login em 390 px foram conferidos no navegador sem transbordamento horizontal. A mudança dos offsets dos traços foi observada no estilo renderizado. Reduced motion foi revisado no código, sem alterar a preferência do sistema. Nenhuma regra de autenticação, API, banco ou dependência foi alterada.

A revisão seguinte da animação, em 17/10, substituiu os traços sobre caminhos fixos por partículas flutuantes e conexões graduais por proximidade, após comparação visual do movimento no portal SENAI. TypeScript e build de produção aprovados. A rede foi conferida em quadros sucessivos nos dois temas e o Canvas acompanhou os viewports de 320/390 px sem transbordamento horizontal. Pausa por visibilidade, quadro estático em reduced motion, limpeza dos observers/handlers e limitação de delta foram revisadas no código; não foi alterada a preferência do sistema. Logo, layout, formulários e APIs permaneceram intactos.

O contraste da rede foi reforçado em 17/10: crimson mais saturado por tema, pontos com opacidade 0,96 e conexões com opacidade máxima 0,68/espessura de 1 px, mantendo o desaparecimento gradual por distância. Conferência visual claro/escuro e TypeScript/build aprovados; movimento, densidade e limites de desempenho preservados.

A entrega seguinte de 17/10 amplia Insights/Dashboard, reforça novamente as cores da rede e consolida a documentação. Validação automatizada concluída: 185/185 testes backend aprovados em 224,20 s, além de 20/20 testes focados; 84/84 testes frontend aprovados. `npm run build` (`tsc && vite build`) terminou com código 0, validando TypeScript e o build de produção: 2.672 módulos transformados e etapa Vite em aproximadamente 1 min 23 s. Nenhuma migration foi necessária nesta entrega.

A homologação desta rodada no navegador usou SQLite temporário e portas 8001/5174, com dados fictícios separados do banco real. No Dashboard desktop escuro foram conferidos o próximo passo por tarefa atrasada, o mapa de prazos, comparação e cobertura de esforço. Insights foi verificado nas janelas semanal/mensal, com estatísticas dos registros de teste e ordenação por tempo estudado. A janela futura de novembro apresentou comparação indisponível e desabilitou a exportação de comparação corretamente. O CSV de comparação foi baixado e seu conteúdo conferido: 12–17/10 contra 5–10/10, com 210 contra 55 minutos.

Temas claro/escuro e larguras de 390/320 px foram conferidos sem transbordamento horizontal. O calendário de consistência permaneceu com 222 px em área visível de 312 px; o foco por teclado estava visível nos controles conferidos. Esses registros não substituem uma auditoria completa de acessibilidade ou de todos os fluxos da aplicação.

O Dashboard claro também foi conferido em 320 px sem transbordamento. A ação de preparar Focus abriu a tarefa e a disciplina corretas sem iniciar sessão; um dia do mapa de prazos abriu o calendário na data escolhida, com tarefa e bloco correspondentes. Com a API temporária desligada, Insights encerrou o loading e exibiu erro/nova tentativa; ao religá-la e tentar novamente, as análises retornaram. A rede com cores reforçadas foi conferida no login claro e escuro; a preferência de movimento reduzido do sistema não foi alterada.

A fixture de testes usa bcrypt real com custo de 4 rounds apenas dentro do processo pytest e restaura a configuração original no teardown. A aplicação mantém o custo padrão de 12 rounds em produção; configuração, credenciais e processos reais não recebem essa redução. A suíte continua usando bancos isolados. Não houve envio SMTP real nesta validação; os limites operacionais da recuperação permanecem os descritos acima.

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

O SQLite local deixou de ser rastreado; o arquivo e seus dados permanecem no ambiente de trabalho. Instalações novas usam as migrations, conforme o [README principal](../README.md#executar-localmente).
