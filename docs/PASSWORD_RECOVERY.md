# Recuperação de senha

O fluxo está implementado na API e nas rotas `/forgot-password` e `/reset-password`. O ambiente local ainda precisa de um provedor SMTP para entregar mensagens. Nenhum e-mail real foi enviado durante a implementação ou os testes automatizados.

## Configuração local

Configure `backend/.env` com as variáveis descritas em `backend/.env.example`. O arquivo `.env` fica fora do Git; não coloque credenciais em documentação, commits ou URLs.

```dotenv
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.seu-provedor.example
SMTP_PORT=587
SMTP_USERNAME=usuario-do-provedor
SMTP_PASSWORD=credencial-do-provedor
SMTP_TLS=true
SMTP_SSL=false
EMAILS_FROM_EMAIL=estudos@seu-dominio.example
EMAILS_FROM_NAME=EduTrack
SMTP_TIMEOUT_SECONDS=10
RESET_TOKEN_EXPIRE_MINUTES=30
```

Esses valores são exemplos. Use as configurações e o remetente autorizado pelo seu provedor de e-mail. Para TLS implícito, ajuste a porta indicada pelo provedor, use `SMTP_SSL=true` e `SMTP_TLS=false`. Autenticação SMTP exige TLS; username e password devem ser configurados juntos. `FRONTEND_URL` aceita apenas uma origem HTTP(S), sem caminho, query, fragmento ou credenciais. Reinicie o backend após configurar o ambiente.

## Comportamento

- `POST /api/v1/auth/forgot-password`, com `{email}`, retorna `202` genérico quando o serviço está configurado. A resposta confirma recebimento do pedido e não comprova entrega; contas desconhecidas/inativas recebem a mesma resposta.
- Sem transporte configurado, todas as contas recebem `503`, antes da busca pelo usuário. A interface permite tentar novamente e não exibe sucesso falso.
- Pedidos têm cooldown de 60 segundos, limite de 3 por e-mail e 30 por IP em 15 minutos. Excesso retorna `429` e `Retry-After`.
- O e-mail contém `/reset-password#token=…`. O fragmento evita enviar o token no GET. A tela guarda o token em memória e o remove da URL; recarregar a página exige abrir o link novamente ou pedir outro.
- `POST /api/v1/auth/reset-password`, com `{token,new_password}`, retorna `200` em sucesso ou `400` genérico para link inválido, expirado, utilizado ou conta indisponível. A senha exige pelo menos 6 caracteres e no máximo 72 bytes UTF-8, conforme bcrypt.
- Redefinir a senha invalida todos os links emitidos com o hash anterior, inclusive em disputa concorrente. A API não retorna tokens de recuperação nem os registra em logs.

## Limites operacionais

O envio usa `BackgroundTasks`: reiniciar o processo pode perder uma mensagem pendente, e não há retry persistente. Falhas SMTP geram log genérico, sem destinatário, conteúdo ou token. Homologue a entrega com o provedor configurado antes de disponibilizar o fluxo a usuários.

O rate limit fica em memória por processo, com chaves HMAC e cache limitado. Reiniciar limpa esse estado; múltiplos workers exigem armazenamento compartilhado. Atrás de proxy, configure a confiança nos headers de encaminhamento para identificar corretamente o IP.

JWTs de acesso emitidos antes de uma redefinição continuam válidos até seu vencimento. Revogação imediata de sessões requer uma evolução específica do controle de tokens. O fluxo não efetua login automático após redefinir a senha.
