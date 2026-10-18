# Recuperação de senha

O fluxo está implementado na API e nas rotas `/forgot-password` e `/reset-password`, com outbox persistente e worker separado. Ainda não há provedor SMTP nem domínio/host de produção fornecidos. A validação usa SMTP real de loopback em teste descartável; nenhuma mensagem externa foi enviada e nada foi publicado.

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

Esses valores são exemplos. Use as configurações e o remetente autorizado pelo provedor. A senha de login no EduTrack não é uma credencial SMTP. Para TLS implícito, use a porta do provedor, `SMTP_SSL=true` e `SMTP_TLS=false`. Autenticação SMTP exige TLS; username e password devem ser configurados juntos. `FRONTEND_URL` aceita apenas uma origem HTTP(S), sem caminho, query, fragmento ou credenciais. Reinicie API e worker após configurar o ambiente.

Antes de iniciar os processos, aplique migrations somente depois de backup e validação em cópia do banco. A migration `c18e20c4d202` cria as tabelas operacionais, sem alterar usuários ou registros acadêmicos.

Execute em um segundo terminal, a partir de `backend`, com o mesmo ambiente/banco/segredo da API:

```powershell
.\venv\Scripts\python.exe -m app.workers.email_worker
# Uma tentativa, útil para operação assistida:
.\venv\Scripts\python.exe -m app.workers.email_worker --once
# Contagens por estado, sem destinatário/conteúdo/token:
.\venv\Scripts\python.exe -m app.workers.email_worker --status
```

Sem SMTP o worker termina com erro explícito; a API continua disponível em desenvolvimento e a recuperação retorna `503`.

## Comportamento

- `POST /api/v1/auth/forgot-password`, com `{email}`, retorna `202` genérico quando o serviço está configurado. Para contas ativas, a intenção de entrega já está persistida antes da resposta. A resposta não comprova entrega; contas desconhecidas/inativas recebem a mesma resposta.
- Sem transporte configurado, todas as contas recebem `503`, antes da busca pelo usuário. A interface permite tentar novamente e não exibe sucesso falso.
- Pedidos têm cooldown de 60 segundos, limite de 3 por e-mail e 30 por IP em janela deslizante de 15 minutos. O banco compartilha esses limites entre processos/reinícios; chaves HMAC evitam persistir e-mail/IP no rate limit. Uma transação curta serializa a decisão das duas políticas, sem consumir parcialmente pedidos rejeitados. Excesso retorna `429` e `Retry-After`.
- O e-mail contém `/reset-password#token=…`. O fragmento evita enviar o token no GET. A tela guarda o token em memória e o remove da URL; recarregar a página exige abrir o link novamente ou pedir outro.
- `POST /api/v1/auth/reset-password`, com `{token,new_password}`, retorna `200` em sucesso ou `400` genérico para link inválido, expirado, utilizado ou conta indisponível. A senha exige pelo menos 6 caracteres e no máximo 72 bytes UTF-8, conforme bcrypt.
- Redefinir a senha invalida todos os links emitidos com o hash anterior, inclusive em disputa concorrente. A API não retorna tokens de recuperação nem os registra em logs.

## Limites operacionais

A outbox armazena somente referência ao usuário e fingerprint da senha, nunca o token, conteúdo ou e-mail duplicado. O worker cria o link no momento da entrega. Pedidos aguardam no máximo a janela `RESET_TOKEN_EXPIRE_MINUTES`; após enviar, o token tem sua própria janela configurada. Pedidos expirados, de contas excluídas/inativas ou cuja senha mudou são descartados. Trocar `SECRET_KEY` invalida links e intenções antigas.

Falhas têm até 5 tentativas, com espera exponencial inicial de 30 segundos, limitada a uma hora. `MAIL_MAX_ATTEMPTS`, `MAIL_RETRY_BASE_SECONDS`, `MAIL_POLL_SECONDS` e `MAIL_LEASE_SECONDS` são configuráveis. Reservas duram 180 segundos e são recuperadas após parada inesperada. Vários workers disputam o mesmo pedido por `UPDATE` condicional; não mantêm transação durante SMTP. Estados finais são eliminados após `MAIL_RETENTION_DAYS` (7 por padrão), em limpeza horária.

A entrega é **pelo menos uma vez**: se SMTP aceitar e o processo morrer antes de gravar `sent`, a recuperação da reserva pode reenviar. A operação SMTP e a gravação SQL não têm transação distribuída; o uso único do token e o limite de tentativas reduzem o impacto. `sent` significa aceitação pelo servidor SMTP, não chegada à caixa de entrada. Homologação do provedor, remetente, SPF/DKIM/DMARC, spam e devoluções ainda depende do domínio/provedor reais.

O limite compartilhado usa uma linha de lock e é adequado ao volume atual. SQLite serializa escritas; para tráfego elevado, medir contenção antes de substituir por infraestrutura dedicada. Todos os processos precisam usar o mesmo banco e segredo. Atrás de proxy, confie em headers encaminhados somente do proxy conhecido; não exponha o Uvicorn diretamente.

Logs registram identificador do pedido, resultado e tentativa, sem destinatário, token, erro bruto SMTP, corpo, IP ou query string. A API devolve `X-Request-ID`, registra rota normalizada/status/duração e trata falhas inesperadas com resposta genérica. O exemplo de produção desabilita access logs do Uvicorn; não habilite logging de bodies ou SQL parameters com contas reais.

JWTs de acesso emitidos antes de uma redefinição continuam válidos até seu vencimento. Revogação imediata de sessões requer uma evolução específica do controle de tokens. O fluxo não efetua login automático após redefinir a senha.

## Produção e monitoramento

`ENVIRONMENT=production` recusa segredo curto/de exemplo, frontend/CORS sem HTTPS, hosts wildcard, SMTP ausente/sem TLS e SQL Server com certificado não verificado. Defina `TRUSTED_HOSTS`, `BACKEND_CORS_ORIGINS`, `FRONTEND_URL`, `SECRET_KEY` aleatória e SMTP reais em arquivo de ambiente fora do checkout, com acesso restrito. Para SQLite, use caminho absoluto persistente em `SQLITE_PATH`, disco local e mesma montagem para API/worker; não use OneDrive ou filesystem de rede em produção. SQL Server exige `DB_TRUST_SERVER_CERTIFICATE=false` e certificado válido.

Os exemplos em `backend/deploy` incluem proxy Caddy com HTTPS, SPA fallback e serviços separados API/worker sob usuário dedicado. São modelos para ajustar ao host Linux; não foram instalados nem publicados. Compile o frontend com `VITE_API_URL=https://SEU_DOMINIO/api/v1`, instale dependências em venv e faça backup/migration antes de reiniciar serviços. O arquivo `deploy/logging.json` ativa logs operacionais. Limite forwarded headers a `127.0.0.1`, se esse for o endereço real do proxy. Configure o serviço Caddy com `EDUTRACK_HOST` e `EDUTRACK_DIST` reais, valide DNS/certificados e teste login/recuperação antes de liberar acesso.

- `/health/live`: processo HTTP responde, sem consultar banco.
- `/health/ready`: verifica conexão e tabela da outbox; retorna `503` genérico se indisponível. Não testa rede SMTP nem comprova que o worker está vivo.
- O supervisor deve monitorar/reiniciar os dois processos. Acompanhe `--status`, erros `recovery_worker database_unavailable`, pedidos `failed`, retries contínuos e crescimento de pendências. A publicação exige configurar alertas externos e uma política de retenção de logs; nenhum serviço de monitoramento externo está contratado/configurado.
- A API desabilita Swagger/OpenAPI públicos em produção e adiciona headers de segurança. Não há certificado gerado ou domínio registrado pelo projeto.

## Backup SQLite e ensaio de restauração

Use o utilitário independente de `.env` em `backend/scripts/sqlite_backup.py`. Ele usa a API de backup online do SQLite (inclui transações confirmadas ainda no WAL), verifica `integrity_check`, gera manifesto SHA-256/contagens/revisões e recusa sobrescrever destinos. Não copie apenas o `.db` de um banco ativo.

```powershell
# A pasta de destino deve existir, ficar fora do Git e ter acesso restrito.
.\venv\Scripts\python.exe scripts/sqlite_backup.py backup edutrack.db .backups/edutrack-20261018.db
.\venv\Scripts\python.exe scripts/sqlite_backup.py verify .backups/edutrack-20261018.db
.\venv\Scripts\python.exe scripts/sqlite_backup.py restore .backups/edutrack-20261018.db .backups/restore-20261018.db
```

O restore exige manifesto íntegro e arquivo de destino novo; valida integridade, tabelas, contagens e revisões, sem substituir o banco original. Para recuperar produção, pare API/worker, ensaie a restauração em caminho novo, confira o aplicativo nessa cópia e só então altere `SQLITE_PATH`/reinicie. Restauração sobre arquivo existente é recusada. Defina ACL no Windows/permissões no host: `chmod` do script não substitui ACL. Backups contêm dados pessoais e hashes de senha; guarde cópia criptografada fora do host, com retenção e teste periódico de recuperação. Agendamento e armazenamento externo dependem do ambiente do operador. Para SQL Server, use backup/restore nativos; este utilitário aceita somente SQLite.
