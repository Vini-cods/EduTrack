# EduTrack — o que foi corrigido

## Resumo rápido

O cadastro/login nunca funcionavam por causa de um bug real no backend, e o
"design quebrado" era, na maior parte, causado por um bug de CSS que zerava
todo o espaçamento (margin/padding) do app inteiro. Corrigi os dois, além de
uma dúzia de outras incompatibilidades entre frontend e backend que
impediriam o app de funcionar mesmo depois do login. Tudo foi testado de
verdade (rodei o backend, rodei o frontend, cliquei em cada fluxo).

## Como rodar

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

# cria o banco de dados (SQLite, arquivo local, zero configuração)
python -m alembic upgrade head

# inicia o servidor
uvicorn app.main:app --reload
```

O backend sobe em `http://localhost:8000`. Documentação interativa (Swagger)
em `http://localhost:8000/docs`.

Já criei o arquivo `backend/.env` com uma chave secreta gerada e o banco
configurado em SQLite. Não precisa mexer em nada — é só rodar os comandos
acima.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`. Já criei o `frontend/.env` apontando pro
backend local.

### 3. Use o app

Acesse `http://localhost:5173`, clique em "Criar uma conta", cadastre-se e
pronto — login e cadastro funcionam agora.

---

## O bug que travava 100% dos cadastros

Em `backend/app/services/auth_service.py`, o código tentava criar o usuário
passando `full_name=...`, mas a tabela `User` no banco só tem uma coluna
chamada `name`. Isso derrubava a criação do usuário com um erro Python
*antes mesmo* de tocar no banco — ou seja, **todo cadastro falhava, sempre**,
não importa o que fosse digitado no formulário.

## O bug que quebrava o design do app inteiro

Em `frontend/src/index.css` havia uma regra:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

escrita **fora** de qualquer `@layer` do Tailwind. No CSS moderno, uma regra
"sem camada" (`@layer`) sempre vence qualquer regra que esteja dentro de uma
camada — não importa a especificidade do seletor. Como todas as classes do
Tailwind (`p-8`, `ml-64`, `pl-12`, etc.) vivem dentro da camada
`@layer utilities`, essa regra zerava **todo** o espaçamento do app inteiro,
página por página. Era por isso que:
- o menu lateral ficava por cima do conteúdo principal;
- os ícones dos campos de login/cadastro ficavam em cima do texto;
- os cards, botões e formulários pareciam "colados", sem respiro.

O Tailwind v4 já inclui esse mesmo reset dentro de `@layer base`, então a
regra era redundante — bastou removê-la.

## Outras correções (mais de 20 pontos)

**Rotas da API que o frontend chamava errado:**
- `/auth/token` → `/auth/login`
- `/users/me` → `/auth/me`
- faltava o prefixo `/api/v1` em todas as chamadas
- `/subjects/{id}/tasks` → `/tasks/subject/{id}`
- `PATCH /tasks/{id}` → `PATCH /tasks/{id}/status`

**IDs incompatíveis:** os schemas do backend declaravam os IDs de disciplina
e tarefa como `UUID`, mas o banco de dados usa números inteiros. Corrigido
em todos os schemas, serviços e endpoints.

**Nomes de campos em português vs. inglês:** o frontend mandava/esperava
`nome`, `descricao`, `progresso`, `titulo`; o backend trabalha com `name`,
`description`, `progress`, `title`. Unifiquei tudo em inglês (convenção do
próprio backend), o que também corrigiu os "NaN%" e "undefined" que
apareciam no Dashboard e em Insights.

**Status de tarefa:** o enum do backend usava `PENDING/IN_PROGRESS/COMPLETED`
(maiúsculo, inglês), mas o banco e o frontend já usavam
`pendente/em_andamento/concluida`. Unifiquei em `pendente/em_andamento/concluida`.

**Faltava a coluna `color`** na tabela de disciplinas, embora o
schema/serviço já tentassem usá-la (outro erro que derrubava a criação de
disciplinas).

**Listagem de disciplinas sem progresso:** a rota `GET /subjects` não
devolvia progresso nenhum, então os cards de disciplina nunca mostravam a
barra de progresso. Agora devolve.

**Gráfico de distribuição de tarefas em Insights** dividia as tarefas
pendentes artificialmente ao meio entre "Pendente" e "Em Andamento" em vez
de usar os números reais que o backend já calculava. Corrigido.

**Banco de dados exigia SQL Server + Windows Authentication** — não tinha
nenhuma migração criada, e só funcionaria com SQL Server Express instalado
localmente com esse nome de instância exato. Troquei o padrão para
**SQLite** (funciona na hora, sem instalar nada). O suporte a SQL Server
continua no código, veja abaixo como ativar.

**Logo com fundo branco** aparecendo como uma caixa feia em cima do fundo
roxo gradiente da tela de cadastro — removi o fundo (agora é PNG
transparente).

**Fonte "Inter"** estava configurada de um jeito que nunca carregava (usava
a URL da folha de estilo do Google Fonts diretamente num `@font-face`, o que
não funciona). Corrigido usando `<link>` no `index.html`, que é a forma
recomendada.

**Tela "Esqueci a senha"** era só uma simulação (`setTimeout`) e não
chamava o backend de verdade. Agora chama o endpoint real.

## Se você precisar usar SQL Server em vez de SQLite

Abra `backend/.env` e troque:

```
DB_ENGINE=mssql
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=EduTrackDB
DB_DRIVER=ODBC Driver 18 for SQL Server
```

Você vai precisar ter o SQL Server Express rodando localmente com esse nome
de instância, o ODBC Driver 18 instalado, e o banco `EduTrackDB` já criado
(vazio — o Alembic cria as tabelas). Depois rode `python -m alembic upgrade
head` de novo para criar as tabelas nesse banco.
