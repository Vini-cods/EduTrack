# OpenSpec — guia de desenvolvimento do EduTrack

> **Leia antes de planejar ou alterar o projeto.**
> O EduTrack é um produto de organização acadêmica. Cada mudança deve resolver um problema real do estudante, preservar os dados existentes e produzir um resultado verificável.

- **Atualizado em:** 27/10/2026.
- **Finalidade:** orientar pessoas e agentes na especificação, implementação, validação e evolução do produto.
- **Base:** implementação existente no repositório. Ideias futuras estão identificadas como **PROPOSTAS**.

## 1. Perfil e propósito do projeto

O EduTrack ajuda estudantes universitários e de cursos técnicos a organizar disciplinas, aulas, tarefas, prazos, estudos, materiais, anotações, avaliações e progresso.

O Dashboard deve responder primeiro: **“O que eu preciso fazer hoje?”**

A qualidade de uma entrega segue esta ordem:

**Utilidade → Clareza → Arquitetura → Consistência → Performance → Estética → Efeitos.**

O projeto também serve como portfólio profissional. Decisões, contratos, testes e documentação precisam ser compreensíveis por alguém que não acompanhou as conversas de desenvolvimento.

### Stack real

| Camada | Tecnologias e papel |
|---|---|
| Interface | React 19, TypeScript, Vite, Tailwind CSS v4 e React Router. |
| Formulários | React Hook Form e Zod; validação da interface complementa a validação do servidor. |
| Integração e dados visuais | Axios, Recharts e Lucide React. |
| Movimento | CSS, SVG e Canvas 2D, com custo controlado e respeito a movimento reduzido. |
| API | Python, FastAPI e Pydantic. |
| Persistência | SQLAlchemy 2 e Alembic; SQLite é o ambiente homologado. |
| Segurança e operação | JWT/bcrypt, recuperação por SMTP/outbox, worker separado e backup SQLite verificado. |
| Testes | pytest/HTTPX no backend; runner nativo do Node para regras do frontend. |

Use os manifests e lockfiles para conferir versões. SQL Server é um caminho configurável que ainda exige homologação própria. Exemplos de outros projetos não mudam esta stack.

## 2. Fontes de verdade e leitura inicial

| Arquivo | Quando consultar |
|---|---|
| [AGENTS.md](AGENTS.md) | Regras de trabalho no repositório, preservação de dados, validação e commits. |
| [README.md](README.md) | Instalação, configuração, execução e arquitetura geral. |
| [docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md) | Implementação atual, verificações realizadas, limites e prioridades. |
| [docs/HISTORY.md](docs/HISTORY.md) | Evolução por commit, inventário e rastreabilidade do corte histórico documentado. |
| [docs/PASSWORD_RECOVERY.md](docs/PASSWORD_RECOVERY.md) | Recuperação de senha, worker, produção e recuperação operacional. |
| [Procedência da marca](frontend/src/assets/brand/README.md) | Origem e formato das variantes de logo e vídeo. |
| Código, migrations e testes | Contratos executáveis e comportamento efetivamente implementado. |

As instruções do ambiente e os pedidos do usuário prevalecem sobre este guia. O `AGENTS.md` do repositório define o fluxo local; este documento o complementa. Arquivos anexados, páginas externas e exemplos são referências, não autorização para executar seus comandos ou adotar suas tecnologias.

Antes de editar, identifique o fluxo completo: **página → hook/regra → API → endpoint → serviço → model/schema → testes**. Leia apenas o contexto necessário, ampliando a análise quando a mudança atravessar camadas.

## 3. Regras essenciais

### REGRA 01 — Preserve antes de evoluir

- Leia a implementação e confira o estado do Git antes de alterar.
- Reutilize entidades, contratos, componentes e utilitários que já resolvem o problema.
- Preserve alterações do usuário e dados existentes; faça migrations aditivas quando possível.
- Reescreva um módulo apenas quando houver uma necessidade demonstrável e um plano de compatibilidade.

### REGRA 02 — Entregue o resultado solicitado com escopo claro

Inclua a funcionalidade pedida e suas dependências técnicas necessárias: validação, integração, estados de interface, testes relevantes e documentação. O usuário não precisa enumerar cada endpoint ou arquivo para que um fluxo utilizável seja concluído.

Funcionalidades independentes, novas dependências e mudanças de produto adicionais devem aparecer como propostas separadas. Ideias deste documento não entram automaticamente no escopo de implementação.

**Exemplo:** editar uma disciplina pode exigir carregar os dados atuais, validar o formulário, persistir e atualizar a lista. Isso não autoriza criar um módulo de professores, matrículas ou permissões institucionais.

### REGRA 03 — Separe responsabilidades

| Camada | Deve concentrar |
|---|---|
| Páginas e componentes | Composição, interação e apresentação de estados. |
| Hooks | Carregamento, coordenação e estado de um fluxo reutilizável. |
| `frontend/src/lib` | Regras, projeções, validações e formatação compartilhadas. |
| `frontend/src/api` | Operações HTTP e contratos de integração. |
| Endpoints FastAPI | Entrada/saída, dependências e tradução de erros de domínio. |
| Services Python | Casos de uso, ownership, cálculos e fronteiras transacionais. |
| Models e schemas | Persistência/relacionamentos e contratos de validação. |

Evite componentes gigantes, consultas duplicadas, regras acadêmicas dentro de JSX e `any` sem necessidade. Uma abstração deve reduzir uma repetição real ou proteger uma fronteira clara.

### REGRA 04 — Uma informação deve ter um dono

| Conceito | Entidade existente | Regra de preservação |
|---|---|---|
| Disciplina | `Subject` | Contexto acadêmico, professor, período e carga. |
| Objetivo ou entrega | `Task` | Prioridade, prazo, estimativa, disciplina e status. |
| Compromisso ou bloco | `CalendarEvent` | Reserva horário; pode se vincular a tarefa/disciplina. |
| Estudo realizado | `StudySession` / `StudySegment` | Registra execução e intervalos ativos. |
| Conhecimento | `Note` | Texto simples, tags e contexto. |
| Referência de estudo | `Material` | URL, categoria, status e disciplina. |
| Plano e resultados | `SubjectSyllabus` / `Assessment` | Conteúdo da disciplina e média parcial com pesos explícitos. |

O Planner atual reutiliza `Task` como objetivo; não crie uma segunda entidade para copiar sua prioridade, estimativa ou prazo. Finalizar uma sessão não conclui automaticamente a tarefa.

### REGRA 05 — Contexto acadêmico exige isolamento

- Derive o proprietário da autenticação, em vez de confiar em um `user_id` enviado pela interface.
- Verifique que tarefa, disciplina, sessão, nota e avaliação pertencem ao mesmo contexto permitido.
- Preserve o padrão de recurso alheio/inexistente sem vazamento de dados; use conflitos e validação de forma consistente com os contratos existentes.
- Considere dois usuários nos testes de qualquer mudança que consulte ou altere dados acadêmicos.

### REGRA 06 — Calendário e tempo precisam ser previsíveis

- Prazos de `Task` aparecem por projeção; não crie eventos persistidos duplicados para o mesmo prazo.
- Recorrência continua materializada com `recurrence_group_id`; ocorrência e série são ações distintas.
- Preserve compromissos legítimos; semelhança de título não é critério suficiente para apagar duplicatas.
- Diferencie datas acadêmicas locais de instantes UTC. Analytics usa fuso IANA e reparte segmentos conhecidos à meia-noite.
- Minutos legados sem segmentos permanecem aproximados; datas antigas de conclusão desconhecidas continuam desconhecidas.
- Conclusão/reabertura e transições de sessão devem manter a atomicidade existente e a proteção contra reenvio/concorrência.

### REGRA 07 — O tema do início continua na entrada e no sistema

- **Claro no login/cadastro → vídeo claro → Dashboard claro.**
- **Escuro no login/cadastro → vídeo escuro → Dashboard escuro.**

A preferência antiga da conta não substitui essa escolha. O tema é capturado no envio do acesso e aplicado ao primeiro render autenticado; depois, somente `{theme}` é sincronizado, preservando capacidade e Pomodoro.

Reload mantém a intenção pendente, inclusive antes da confirmação de `/auth/me`, e não repete o vídeo. Alterações posteriores de tema substituem a escolha anterior e atualizam a preferência deste navegador. O modo Sistema acompanha o dispositivo.

A introdução permanece em tela cheia, sem controles/textos de interface, com autoplay sem som, saída automática ao terminar ou falhar e alternativa sem vídeo em movimento reduzido. Escape continua disponível. O preenchimento por `cover` pode recortar as bordas da mídia horizontal em telas verticais.

### REGRA 08 — Dados reais e linguagem honesta

Insights devem explicar o que foi registrado, o período considerado e as limitações. Diferencie:

- estudo planejado de estudo realizado;
- estado atual de tarefas por prazo de eventos históricos de conclusão;
- capacidade disponível de carga prevista;
- média parcial de avaliação de resultado oficial da instituição.

Base zero, janela futura, histórico insuficiente e estimativa ausente precisam de estados próprios. Gráficos, recomendações e textos não devem inventar precisão, produtividade, notas, eficiência ou capacidade de aprendizagem.

### REGRA 09 — A interface deve funcionar nos estados difíceis

Todo fluxo relevante considera **loading, vazio, erro, nova tentativa e feedback de ação**. Uma falha não pode produzir um sucesso simulado nem manter um spinner sem fim.

Use teclado e foco previsíveis, labels associados, erros legíveis e confirmações proporcionais às consequências. Verifique mobile, tablet e desktop de verdade; reduzir a largura de um card não é suficiente. Otimismo de UI exige reconciliação e estado de sincronização coerentes com o fluxo existente.

### REGRA 10 — Identidade e movimento têm função

A identidade combina **academia, editorial, tecnologia, produtividade e dados**. Prefira off-white, branco, grafite, cinza, navy e crimson; roxo não deve dominar a interface.

Use tipografia, hierarquia e espaço para orientar decisões. Preserve símbolo interno, marca completa no acesso e procedência dos assets. Evite gradientes excessivos, glassmorphism, sombras pesadas e aparência infantil.

Movimento deve comunicar entrada, progresso ou mudança de estado. Respeite `prefers-reduced-motion`; preserve limites de partículas/DPR/fps, pausa em aba oculta e limpeza de observers/listeners/rAF. Uma referência visual a WebGL não justifica adicionar uma engine.

### REGRA 11 — Segurança, dados e operação são parte da entrega

- Mantenha `.env`, credenciais, bancos e backups locais fora do Git. Documente nomes de variáveis, não valores reais.
- Use migrations versionadas; ensaie em cópia antes de atualizar banco em uso e confira preservação/integridade.
- Preserve transações, constraints, ownership, expiração de tokens e limites de recuperação.
- Logs e exemplos devem omitir senhas, tokens, corpos sensíveis e dados pessoais desnecessários.
- Produção exige configuração real e homologação. Exemplos de serviço/proxy e worker preparado não significam deploy realizado.

Na recuperação, conta ativa existente tem intenção persistida antes do 202; conta inexistente/inativa recebe resposta genérica sem entrega. Aceitação do pedido ou do SMTP não comprova chegada à caixa postal. A entrega continua pelo menos uma vez, com os limites documentados no guia operacional.

### REGRA 12 — Evidência vale mais que aparência de conclusão

Uma feature está pronta quando seu comportamento foi conferido, não apenas quando o build passou. Registre exatamente os comandos executados, resultados e caminhos revisados apenas em código.

Use os termos **IMPLEMENTADO**, **VALIDADO**, **PROPOSTO**, **PENDENTE** e **DESCARTADO** com significado claro. Marcar uma tarefa como concluída exige resultado real; um plano, mockup ou teste adicionado não equivale a execução aprovada.

## 4. Fluxo de trabalho orientado por especificação

### Passo 1 — Entender a necessidade

Registre o problema do estudante, o resultado esperado, o escopo e o que já existe. Identifique ambiguidades que mudam o resultado e avance no trabalho independente enquanto obtém a informação necessária.

### Passo 2 — Escolher o nível de documentação

| Mudança | Documentação proporcional |
|---|---|
| Correção pequena ou ajuste de UI | Problema, comportamento esperado, verificação e commit. |
| Feature com regras ou várias camadas | Proposta curta, requisitos/cenários, tarefas e validação. |
| Mudança de model, contrato ou arquitetura | Acrescentar desenho, compatibilidade, migration/preservação e trade-offs. |

A especificação deve reduzir incerteza. Não crie um processo de cinco arquivos para trocar um texto ou corrigir uma cor.

### Passo 3 — Especificar antes de implementar

Para mudanças que justificam um pacote de especificação, esta é a **estrutura recomendada**, criada somente quando necessária:

```text
openspec/
  specs/<capability>/spec.md                 # contrato vigente consolidado
  changes/<change-id>/
    proposal.md                             # problema, mudança e impacto
    design.md                               # decisões relevantes, se necessário
    tasks.md                                # execução verificável
    validation.md                           # evidências e limitações
    specs/<capability>/spec.md               # delta proposto do contrato
```

Esses caminhos são uma convenção de trabalho; esta edição não instala CLI, extensão, hook ou validador OpenSpec. Consulte as regras e a versão da ferramenta efetivamente adotada antes de afirmar compatibilidade ou executar comandos específicos.

### Passo 4 — Implementar em unidades coerentes

Comece pelo contrato e pelas regras afetadas. Reutilize o que existe, implemente o fluxo de ponta a ponta e mantenha cada unidade pequena o suficiente para revisão. Separe funcionalidades independentes e registre decisões que alteram comportamento ou compatibilidade.

### Passo 5 — Validar, documentar e versionar

Execute verificações proporcionais ao risco, confira regressões do fluxo, atualize o estado do projeto e revise o diff. Faça um commit descritivo ao concluir a unidade. Push depende da solicitação do usuário; autorizações já fornecidas na sessão continuam válidas. Deploy é uma ação separada.

### Passo 6 — Consolidar o contrato entregue

Depois de implementar e validar uma mudança aceita, incorpore seu delta ao contrato permanente, atualize o status e identifique ou arquive a proposta com suas evidências. Preserve as decisões descartadas como histórico quando forem relevantes. Uma proposta ainda pendente permanece separada do comportamento vigente.

## 5. Modelos prontos para usar

### `proposal.md` — por que a mudança existe

```markdown
# <change-id>

Status: PROPOSTO

## Why
Qual problema real do estudante será resolvido?

## What Changes
- Comportamento que será adicionado ou alterado.
- Reutilização de entidades e componentes existentes.

## Impact
- Camadas, contratos, dados e telas afetados.
- Compatibilidade, riscos e validações necessárias.

## Out of Scope
- Funcionalidades independentes que ficam para outra decisão.
```

### `spec.md` permanente — contrato vigente

```markdown
# theme-continuity Specification

## Purpose
Manter a escolha visual do estudante durante o acesso ao EduTrack.

## Requirements

### Requirement: Preserve entry theme
O EduTrack SHALL manter o tema escolhido no acesso no vídeo e no Dashboard.

#### Scenario: Claro contra perfil anteriormente escuro
- **WHEN** o estudante escolhe claro no login e autentica com perfil salvo em escuro
- **THEN** o vídeo e o Dashboard usam claro
- **AND** somente o tema é sincronizado, preservando capacidade e Pomodoro

#### Scenario: Recarregamento após entrar
- **WHEN** o estudante recarrega uma sessão autenticada
- **THEN** a escolha de tema é preservada conforme a intenção pendente ou perfil confirmado
- **AND** a introdução não é repetida
```

### Delta de mudança — o que será alterado

```markdown
# study-planning Specification

## Purpose
Descrever o delta de um comportamento proposto para o Planner.

## ADDED Requirements

### Requirement: Preview rescheduled blocks
O EduTrack SHALL apresentar uma prévia antes de aplicar uma redistribuição de blocos.

#### Scenario: Estudante descarta a simulação
- **WHEN** o estudante descarta a prévia sem confirmar
- **THEN** os CalendarEvents originais permanecem inalterados
```

Use `## Requirements` no contrato permanente e `## ADDED Requirements`, `## MODIFIED Requirements` ou `## REMOVED Requirements` nos deltas. Cada `### Requirement:` precisa de pelo menos um `#### Scenario:` com condição e resultado observáveis. `SHALL`/`MUST` identificam obrigação; frases vagas como “ser intuitivo” precisam de um critério verificável.

O exemplo de redistribuição é uma **PROPOSTA**, não uma função já entregue ou uma tarefa autorizada nesta edição.

### `tasks.md` — execução rastreável

```markdown
# Tasks — <change-id>

## 1. Entender e especificar
- [ ] Conferir o fluxo existente e os contratos afetados.
- [ ] Definir requisitos, cenários e limites da mudança.

## 2. Implementar
- [ ] Ajustar somente as camadas necessárias ao comportamento solicitado.
- [ ] Integrar loading, erro, vazio e feedback aplicáveis.
- [ ] Preservar ownership, dados, teclado e temas.

## 3. Validar e concluir
- [ ] Executar as verificações relevantes e registrar resultados.
- [ ] Conferir regressões e limitações restantes.
- [ ] Atualizar documentação e revisar o diff.
- [ ] Criar commit da unidade coerente.
```

Substitua os itens genéricos por tarefas concretas da mudança. Dependências técnicas necessárias fazem parte do trabalho; features independentes permanecem fora. Marque `[x]` somente depois de obter evidência.

### `validation.md` — o que foi realmente conferido

```markdown
# Validation — <change-id>

## Ambiente e escopo
Revisão, ambiente isolado e fluxos exercitados.

## Verificações executadas
| Verificação | Comando ou cenário | Resultado |
|---|---|---|
| <tipo> | <execução real> | <resultado real ou não executado> |

## Limitações
Caminhos apenas revisados, verificações pendentes e dependências externas.

## Decisão de conclusão
Concluído, parcialmente validado ou pendente, com motivo objetivo.
```

## 6. Validação e definição de pronto

No diretório `frontend`:

```powershell
npm run typecheck
npm test
npm run build
```

`build` já inclui TypeScript. Use as verificações necessárias sem repetir checks aprovados por rotina, salvo se novas alterações, falhas ou dúvidas justificarem. Uma mudança só documental exige conferência de conteúdo, links e diff, não uma nova execução da aplicação.

No diretório `backend`, quando API, regra, model ou migration forem afetados:

```powershell
.\venv\Scripts\python.exe -m pytest -q
```

Use testes focados durante o trabalho e a suíte completa quando a mudança for transversal. Migrations exigem ensaio de compatibilidade/preservação em banco isolado antes de aplicação em dados reais, conforme o README.

### Checklist de conclusão

- [ ] O problema pedido foi resolvido e os cenários de aceitação foram conferidos.
- [ ] Regras/IO/apresentação continuam separados; contratos e entidades existentes foram reutilizados.
- [ ] Ownership, reenvio, concorrência e preservação foram verificados onde relevantes.
- [ ] Loading, vazio, erro, nova tentativa e feedback fazem sentido no fluxo.
- [ ] Teclado, foco, temas, responsividade e movimento reduzido foram considerados.
- [ ] Resultados executados estão registrados; limitações reais estão explícitas.
- [ ] Diff contém só arquivos intencionais; dados locais e credenciais estão fora.
- [ ] Documentação e commit descrevem a implementação final.

## 7. Padrões de código, Git e comunicação

- Código novo usa nomes em inglês: `snake_case` no Python/banco, `camelCase` em funções/variáveis TypeScript e `PascalCase` em componentes/tipos. Preserve enums e contratos legados existentes; não renomeie status apenas para uniformizar idioma.
- Interface e documentação são em português claro. Mensagens de erro devem orientar a próxima ação e refletir a resposta real.
- Branches de trabalho seguem `codex/<descricao>` neste ambiente, salvo nome explicitamente solicitado pelo usuário.
- Commits seguem assunto claro: `feat`, `fix`, `refactor`, `perf`, `test`, `docs` ou `chore`, com escopo quando ajudar.
- Antes de cada commit, revise o diff e preserve alterações alheias. Separe mudanças independentes; documente a unidade concluída.
- Push e publicação respeitam o escopo e as autorizações do usuário; não transforme configuração de exemplo em deploy automático.
- Nas atualizações de trabalho, explique descoberta, decisão relevante e o que a próxima verificação resolve. Ao concluir, informe resultado, validação, limites materiais e commit.

## 8. Laboratório de evolução — ideias propostas

As ideias abaixo são criações para o planejamento do produto. **Nenhuma está declarada como implementada, validada ou automaticamente autorizada para desenvolvimento.** Sua prioridade depende de necessidade real e decisão de escopo.

### PROP-01 — Simulador de semana

- **Problema:** a semana muda depois que os blocos já foram planejados.
- **Proposta:** experimentar a redistribuição de blocos futuros e comparar carga, conflitos e proximidade dos prazos antes de aplicar.
- **Reuso:** CalendarEvent, Task e Academic Load; os dados reais permanecem intactos durante a simulação.
- **Aceitação:** descartar preserva a agenda; confirmar apresenta exatamente quais blocos mudam e respeita ownership/conflitos.
- **Limite:** não prever aprendizagem nem reagendar aulas ou provas silenciosamente.

### PROP-02 — Caixa de entrada acadêmica

- **Problema:** registrar algo rapidamente não deveria exigir decidir na hora sua classificação final.
- **Proposta:** captura curta com triagem posterior para tarefa, nota ou compromisso, mostrando uma prévia da conversão.
- **Reuso:** formulários/entidades existentes; decidir persistência da captura só ao desenhar o fluxo.
- **Aceitação:** conversão explícita preserva conteúdo e contexto, evita duplicatas e informa o destino criado.
- **Limite:** não transformar toda anotação automaticamente em tarefa nem criar calendários paralelos.

### PROP-03 — Mapa de preparação para provas

- **Problema:** tempo estudado não revela sozinho quais tópicos ainda precisam de revisão.
- **Proposta:** relacionar tópicos confirmados do plano de ensino com notas, materiais e sessões, permitindo marcar a preparação percebida pelo estudante.
- **Reuso:** SubjectSyllabus, Note, Material e StudySession, com vínculos definidos em proposta própria.
- **Aceitação:** mostrar tópicos sem evidência de revisão e a origem de cada associação; permitir correção manual.
- **Limite:** autoavaliação e registros não significam domínio comprovado nem previsão de nota.

### PROP-04 — Dossiê portátil da disciplina

- **Problema:** o conhecimento organizado perde utilidade se o estudante não consegue consultá-lo fora do sistema.
- **Proposta:** exportar uma seleção de plano, avaliações, notas e referências com período, autoria e limites explícitos.
- **Reuso:** dados já persistidos; escolher formato e tamanho quando o caso de uso estiver definido.
- **Aceitação:** prévia do conteúdo exportado, somente dados do proprietário e ausência de credenciais/tokens.
- **Limite:** não criar compartilhamento público ou exportação de dados de terceiros como efeito colateral.

### PROP-05 — Reflexão pós-sessão

- **Problema:** finalizar o cronômetro registra duração, mas pode perder o contexto de avanço e bloqueios.
- **Proposta:** reflexão opcional com “o que avancei”, “o que me bloqueou” e “próximo passo”.
- **Reuso:** Note vinculada à StudySession, sem criar uma segunda fonte de anotações.
- **Aceitação:** a sessão termina mesmo sem reflexão; salvar cria uma nota rastreável e o próximo passo não vira Task sem confirmação.
- **Limite:** sem avaliação automática de desempenho ou obrigatoriedade que atrase o encerramento.

### PROP-06 — Calibração de estimativas

- **Problema:** o estudante pode repetir estimativas pouco realistas sem perceber a diferença entre intenção e registro.
- **Proposta:** uma leitura específica por tarefa compara estimativa e tempo registrado, explicando amostra, dados ausentes e mudanças de escopo.
- **Reuso:** Task, StudySession e segmentos; distinguir esse fluxo dos agregados de analytics já existentes.
- **Aceitação:** identificar valores aproximados/legados e manter estimativas originais até alteração explícita.
- **Limite:** não medir capacidade intelectual nem recomendar uma estimativa precisa com histórico insuficiente.

## 9. Próximos passos já identificados no produto

O [estado de desenvolvimento](docs/DEVELOPMENT_STATUS.md) continua sendo a referência para pendências reais. As prioridades atuais incluem ampliar QA integrado/acessibilidade, escolher infraestrutura e SMTP, operacionalizar backups e homologar o ambiente de publicação.

Notes, Materials, Academic Load, analytics, preferências, busca paginada e outbox já existem. As propostas deste guia devem evoluir essas bases, preservando seus contratos e limites.

**Regra final:** preserve o que funciona, especifique o que muda, implemente o necessário e registre o que foi realmente verificado.
