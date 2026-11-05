# Assistente acadêmica — Morgana

Status: EM IMPLEMENTAÇÃO em 05/11/2026.

## Purpose

Ajudar o estudante a transformar suas tarefas e compromissos em próximos passos claros, por meio de uma assistente com a aparência da Morgana de Persona 5. A primeira versão é consultiva: oferece orientação usando um resumo acadêmico real e não altera registros.

## Requirements

### Requirement: assistência autenticada e contextual

O sistema SHALL oferecer chat nas páginas internas, com leitura de dados exclusivamente do usuário autenticado. A mensagem, o histórico recente e um resumo opcional de disciplinas, tarefas abertas e próximos compromissos são enviados à OpenAI pelo backend.

#### Scenario: priorizar a rotina

- WHEN o estudante pergunta o que deve estudar com o contexto habilitado;
- THEN a resposta considera tarefas abertas e compromissos disponíveis no resumo, explicita dados ausentes e distingue planejamento de execução;
- AND a interface mostra quais registros integraram o contexto, sem apresentá-los como citações verificadas do modelo.

#### Scenario: preservar registros

- WHEN a mensagem pede para concluir, excluir ou criar uma atividade;
- THEN a assistente explica seu limite consultivo e orienta o uso da área correspondente;
- AND nenhuma entidade é escrita pelo endpoint do chat.

### Requirement: configuração e fronteira externa

A chave da OpenAI MUST permanecer somente no backend. A interface SHALL informar a transferência de mensagem e resumo ao provedor e permitir desabilitar o contexto acadêmico.

#### Scenario: nenhuma chave disponível

- WHEN a OpenAI não está configurada;
- THEN o pet e o painel continuam acessíveis, a indisponibilidade é explícita e nenhuma resposta simulada é apresentada como IA.

#### Scenario: conversar sem resumo acadêmico

- WHEN o estudante desativa o contexto;
- THEN a conversa anterior é limpa, qualquer resposta pendente é invalidada e o backend não consulta nem envia registros acadêmicos para essa requisição.

### Requirement: histórico e isolamento

O histórico SHALL existir somente na memória da sessão de interface. O backend SHALL validar tamanhos e papéis das mensagens, limitar dados e tratar títulos/histórico como conteúdo não confiável. Troca de conta ou sessão MUST descartar a conversa e respostas antigas.

### Requirement: pet acessível e leve

O pet SHALL ser uma ilustração vetorial da Morgana com estados de repouso, processamento, resposta e falha. O painel SHALL oferecer teclado, fechamento por Escape, retorno de foco, tema claro/escuro, tamanho adequado ao mobile e respeito a `prefers-reduced-motion`.

### Requirement: falhas previsíveis

O sistema SHALL oferecer feedback de carregamento, cancelamento e nova tentativa. Configuração ausente, ocupação, timeout e falhas do provedor não podem vazar chave, prompt interno ou corpo bruto da API. Não há repetição automática de chamadas pagas.

## Decisões e limites

- Reutilizar `httpx`, autenticação e entidades existentes. Não adicionar SDK, engine de animação, banco de vetores ou migrations para este recorte.
- Usar Responses API com `store: false`, sem ferramentas externas, navegação ou execução de código. Isso não equivale a prometer retenção zero no provedor.
- Contexto limitado e ordenado no servidor; anotações, materiais, e-mail e credenciais ficam fora da coleta automática. O texto que o usuário digita continua sendo enviado.
- Sem CRUD autônomo, histórico persistido, voz, upload, navegação na web ou memória entre dispositivos nesta versão.
- Configuração declarada não comprova que uma chave é válida, que há saldo ou que o modelo está autorizado. Homologação real depende da credencial local.
- Aparência da Morgana desenhada em SVG para esta interface; identidade principal do EduTrack permanece independente.

## Validação prevista

- API: autenticação, isolamento entre dois usuários, vínculos inconsistentes, limites de entrada/contexto, opt-out, payload OpenAI e erros com transporte simulado.
- Interface: histórico limitado, caminhos internos seguros, descarte de respostas antigas, type-check, suíte de regras e build.
- Navegador: pet/painel, estado sem configuração, teclado, temas e viewport mobile. Chamada real somente se houver chave local disponível.

As evidências efetivamente realizadas serão registradas em `docs/DEVELOPMENT_STATUS.md` e no guia operacional da assistente.
