# Morgana — assistente acadêmica

A Morgana é a assistente consultiva do EduTrack, com um pet vetorial inspirado na personagem de Persona 5. Ajuda a priorizar tarefas, preparar revisões e organizar a rotina a partir de um recorte dos dados da conta. As sugestões precisam ser avaliadas pelo estudante; o chat não cria, exclui, conclui ou modifica registros.

O contrato de produto está na [especificação](../openspec/specs/academic-assistant/spec.md). Esta versão não adiciona dependências nem migrations.

## Configuração da OpenAI

No arquivo local `backend/.env`, configure:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_TIMEOUT_SECONDS=30
```

Preencha `OPENAI_API_KEY` localmente com uma chave válida e reinicie a API. Não envie a chave no chat, não a coloque em variáveis `VITE_*` e não versione o `.env`. A interface não recebe o segredo e não oferece um campo para armazená-lo no navegador.

O modelo é configurável. O padrão usa a [Responses API](https://developers.openai.com/api/docs/guides/text), suportada pelo [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Acesso ao modelo, limites e saldo dependem da conta do provedor; a presença da configuração não valida a credencial. Não há chamadas de teste pagas no startup nem retries automáticos.

Sem chave, as outras áreas do EduTrack continuam funcionando. O pet abre o painel e explica a indisponibilidade, sem gerar respostas falsas.

## Contexto e privacidade

Ao enviar uma mensagem, o backend encaminha à OpenAI o texto e as últimas mensagens da conversa. Com o contexto acadêmico habilitado, inclui também um resumo limitado e isolado pelo usuário autenticado:

- Até 20 tarefas abertas, priorizadas por prazo e prioridade, com disciplina e estimativa quando disponíveis.
- Até 20 próximos compromissos em uma janela de 14 dias.
- Até 20 disciplinas e até 5 sessões iniciadas nos últimos 7 dias. A duração representa o total ativo de cada sessão no instante da consulta, sem fingir distribuição diária.

Esses limites evitam transferir a conta inteira. O painel informa quando o recorte é parcial; registros incluídos são apresentados como **contexto consultado**, não como comprovação de que cada frase da resposta está correta.

A coleta automática não inclui e-mail, senha, credenciais, corpo de anotações ou materiais. Tudo que o estudante digitar na mensagem continua sendo enviado. Ao desativar o contexto, a conversa anterior é descartada para evitar reenviar seu conteúdo como histórico; o backend não consulta os registros acadêmicos para essa chamada.

As conversas ficam apenas na memória da interface: recarregar, sair ou trocar de sessão descarta o histórico. `store: false` desativa o armazenamento da resposta como estado de conversa na API; não é uma garantia de retenção zero em toda a infraestrutura do provedor. As políticas da OpenAI continuam aplicáveis.

## Aparência e interação

A Morgana usa SVG próprio, com cabeça preta, focinho branco, olhos azuis grandes, braços cruzados e bandana amarela, conforme a referência visual enviada pelo usuário. As animações comunicam repouso, caminhada, processamento, resposta e erro; movimento reduzido mantém a ilustração estática. A marca e os temas do EduTrack permanecem independentes da aparência do pet.

O pet aparece sem caixa de lançamento e pode caminhar na faixa inferior útil da interface. O estudante pode arrastá-lo ou usar as setas com foco na personagem para reposicionar em toda a área útil; Home devolve ao canto. Colocar acima da faixa inferior mantém a posição manual, sem teletransportá-lo de volta. É possível pausar ou ocultar; o botão da Morgana na barra superior permite restaurá-lo. Quando falta espaço para personagem/controles, o pet é temporariamente suprimido.

Caminhada pausa durante interação, edição de campos, chat aberto, Focus Mode, aba oculta e movimento reduzido. Dicas curtas sobre a página aparecem em balões uma vez por área durante a sessão, com pelo menos 90 segundos entre elas, sem consultar a OpenAI nem presumir dados acadêmicos ausentes. Os controles do pet permanecem disponíveis em tela sensível ao toque e por teclado.

Clicar na Morgana abre um painel responsivo nas páginas autenticadas. É possível fechar por Escape, limpar a conversa, cancelar uma espera e tentar novamente após falha. Respostas são exibidas como texto, sem executar HTML ou links produzidos pelo modelo. Os atalhos de contexto levam somente a rotas internas conhecidas. Cancelar encerra a espera da interface, mas não garante interromper o processamento já recebido pelo provedor; o backend mantém um prazo máximo para sua conexão.

## API e operação

Ambos os endpoints exigem o JWT existente:

| Endpoint | Resultado |
|---|---|
| `GET /api/v1/assistant/status` | Informa se chave/modelo foram configurados, sem revelar a chave ou testar saldo. |
| `POST /api/v1/assistant/chat` | Valida mensagem/histórico/fuso, monta contexto opcional e retorna orientação e referências internas. |

Configuração ausente, timeout, falha do provedor e ocupação têm respostas próprias. Corpos brutos do provedor, prompts e credenciais não são devolvidos na mensagem de erro. Chamadas são limitadas por tamanho, duração e concorrência; a proteção de concorrência em memória vale por processo, sem constituir uma cota de gastos ou um limite distribuído entre workers. Configure limites de uso no provedor antes de disponibilizar a IA publicamente.

Não há persistência de conversa, memória entre dispositivos, pesquisa na web, execução de código, voz, uploads, envio automático de Notes ou alterações autônomas de tarefas nesta entrega.

## Verificação

Os testes automatizados usam transporte HTTP simulado, sem chamar a OpenAI ou consumir saldo. Cobrem autenticação, isolamento, entradas inválidas, contexto desativado, payload e falhas. Type-check, testes do frontend e build verificam a integração da interface; a rodada efetivamente executada fica no [estado de desenvolvimento](DEVELOPMENT_STATUS.md).

Para homologar a conexão real, configure a chave local, entre na conta, abra a Morgana e envie uma pergunta simples. Confira uma pergunta com e outra sem contexto. Uma resposta recebida com sucesso não comprova precisão acadêmica: compare a orientação com os registros mostrados e mantenha as decisões de agenda sob seu controle.

## Rastreabilidade da entrega

| Commit | Unidade entregue |
|---|---|
| `6c475d3` | Especificação inicial da assistente, contexto e fronteira externa. |
| `d8c8000` | Backend OpenAI autenticado, configuração, contexto e 24 testes novos. |
| `aed64b6` | Morgana vetorial conforme referência e estados de animação/caminhada. |
| `f8d3bae` | Chat, pet livre, controles, dicas locais e validação final da interface. |

A configuração real da chave não faz parte do Git. A edição de documentação que consolida esta tabela permanece identificada pelo próprio histórico do repositório.
