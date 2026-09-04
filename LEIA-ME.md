# EduTrack — Guia de Instalação e Uso

Guia definitivo para rodar o projeto do zero em qualquer máquina. Segue os
passos na ordem — não precisa ler mais nada antes.

## Pré-requisitos

- **Python 3.10 ou mais recente** (`python --version` pra conferir)
- **Node.js 18 ou mais recente** (`node --version` pra conferir)
  Nada de banco de dados externo pra instalar — o projeto usa SQLite (um
  arquivo local) por padrão.

---

## 1. Backend

Abra um terminal na pasta `backend`.

**1.1. Crie e ative o ambiente virtual**

```powershell
python -m venv venv
venv\Scripts\activate
```

_(Mac/Linux: `source venv/bin/activate`)_

**1.2. Instale as dependências**

```powershell
pip install -r requirements.txt
```

**1.3. Crie o arquivo `.env`**

Esse arquivo guarda a chave secreta e a configuração do banco. Ele **não
vem em cópias feitas por Git** (fica de fora de propósito, por segurança),
então crie-o sempre que clonar/copiar o projeto pra uma máquina nova:

```powershell
@"
SECRET_KEY=06321edef0674a6f83d80603c38a028a2b101015148027b56826532f27b3e598
DB_ENGINE=sqlite
SQLITE_PATH=edutrack.db
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=EduTrackDB
DB_DRIVER=ODBC Driver 18 for SQL Server
"@ | Set-Content -Encoding UTF8 .env
```

_(Mac/Linux, use este comando no lugar:)_

```bash
cat > .env << 'EOF'
SECRET_KEY=06321edef0674a6f83d80603c38a028a2b101015148027b56826532f27b3e598
DB_ENGINE=sqlite
SQLITE_PATH=edutrack.db
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=EduTrackDB
DB_DRIVER=ODBC Driver 18 for SQL Server
EOF
```

> Se você esquecer esse passo, o app agora usa uma chave padrão de
> desenvolvimento em vez de travar — mas crie o `.env` mesmo assim, é o
> jeito certo.

**1.4. Crie o banco de dados**

```powershell
python -m alembic upgrade head
```

Isso cria o arquivo `edutrack.db` (SQLite) já com todas as tabelas.

**1.5. Inicie o servidor**

```powershell
uvicorn app.main:app --reload
```

Backend rodando em `http://localhost:8000`. Documentação interativa em
`http://localhost:8000/docs`.

---

## 2. Frontend

Abra **outro terminal**, na pasta `frontend`.

**2.1. Instale as dependências**

```powershell
npm install
```

**2.2. Confira o arquivo `.env`**

Deve conter esta linha (crie o arquivo se não existir):

```
VITE_API_URL=http://localhost:8000/api/v1
```

**2.3. Inicie o servidor de desenvolvimento**

```powershell
npm run dev
```

Frontend rodando em `http://localhost:5173`.

---

## 3. Usando o app

Com os dois servidores rodando, acesse `http://localhost:5173`, clique em
**"Criar uma conta"**, cadastre-se e comece a usar. Cadastro e login já
funcionam normalmente.

---

## Usando SQL Server em vez de SQLite (opcional)

Por padrão o projeto usa SQLite (zero configuração). Se você **precisar**
de SQL Server (ex.: exigência de disciplina/trabalho):

1. Instale o driver:

```powershell
   pip install -r requirements-mssql.txt
```

No Windows isso pode pedir o
["Microsoft C++ Build Tools"](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
se não houver um pacote pré-compilado pra sua versão do Python.

2. No `backend/.env`, troque:

```
   DB_ENGINE=mssql
```

3. Tenha o SQL Server Express rodando localmente com a instância
   `SQLEXPRESS`, o ODBC Driver 18 instalado, e o banco `EduTrackDB`
   criado (vazio — o Alembic cria as tabelas).
4. Rode `python -m alembic upgrade head` de novo.

---

## Solução de problemas

| Erro                                                           | Causa                                                        | Solução                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `Microsoft Visual C++ 14.0 or greater is required` ao instalar | Tentando instalar o `pyodbc` sem compilador                  | Você não precisa dele com SQLite — confira se seu `requirements.txt` não tem a linha `pyodbc` |
| `SECRET_KEY Field required`                                    | Falta o arquivo `.env`                                       | Rode o comando do passo **1.3** acima                                                         |
| `alembic : O termo 'alembic' não é reconhecido`                | Ambiente virtual não ativado, ou dependências não instaladas | Confira se `venv\Scripts\activate` foi rodado e se o passo 1.2 terminou sem erro              |
| `uvicorn : O termo 'uvicorn' não é reconhecido`                | Mesma causa acima                                            | Idem                                                                                          |
| Tela de login/cadastro dá erro de rede                         | Backend não está rodando                                     | Confira se o terminal do backend (passo 1.5) está ativo, sem erros                            |
| Erro 404/422 ao usar o app                                     | Frontend e backend com `.env` desalinhados                   | Confira o passo 2.2 — a URL precisa terminar em `/api/v1`                                     |

Se aparecer um erro que não está na tabela, me manda o log completo que eu
resolvo.

---

## O que foi corrigido (resumo técnico)

O cadastro/login não funcionavam por um bug real no backend, e o "design
quebrado" era, na maior parte, um bug de CSS que zerava todo o espaçamento
do app inteiro. Além disso havia mais de 20 incompatibilidades entre
frontend e backend. Tudo foi testado rodando o projeto de verdade
(cliquei em cada fluxo: cadastro, login, criar disciplina, criar tarefa,
mudar status, dashboard, insights).

**Os dois bugs mais graves:**

- **Cadastro sempre falhava:** o backend tentava salvar o usuário com um
  campo (`full_name`) que não existe na tabela do banco (que tem `name`).
  Todo cadastro quebrava antes de tocar no banco.
- **Design quebrado no app inteiro:** havia uma regra `* { margin: 0;
  padding: 0; }` no CSS escrita fora de qualquer `@layer` do Tailwind. No
  CSS moderno, uma regra "sem camada" sempre vence uma regra "em camada" —
  não importa a especificidade. Isso anulava **todo** o espaçamento gerado
  pelas classes do Tailwind (padding, margin) no app inteiro: o menu
  lateral ficava por cima do conteúdo, ícones em cima do texto dos campos,
  etc. Uma linha causando o caos visual todo.
  **Outras correções:**

- Rotas da API que o frontend chamava erradas (`/auth/token` → `/auth/login`,
  `/users/me` → `/auth/me`, faltava o prefixo `/api/v1`, etc.)
- IDs declarados como `UUID` no backend, mas o banco usa números inteiros
- Nomes de campo em português no frontend (`nome`, `descricao`, `progresso`,
  `titulo`) vs. inglês no backend (`name`, `description`, `progress`,
  `title`) — causava os "NaN%" e "undefined" no Dashboard/Insights
- Status de tarefa inconsistente (`PENDING` no backend vs. `pendente` no
  banco/frontend) — unificado em português
- Faltava a coluna `color` na tabela de disciplinas
- Listagem de disciplinas não devolvia progresso nenhum
- Gráfico de distribuição de tarefas em Insights inventava uma divisão
  artificial em vez de usar os números reais
- Banco de dados exigia SQL Server + Windows Authentication sem nenhuma
  migração criada — trocado para SQLite por padrão (SQL Server continua
  disponível, veja a seção acima)
- Logo com fundo branco aparecendo como uma caixa feia sobre o fundo roxo
  da tela de cadastro — corrigido (PNG transparente)
- Fonte "Inter" configurada de um jeito que nunca carregava — corrigida
- Tela "Esqueci a senha" era só uma simulação — agora chama o backend de
  verdade
- `pyodbc` (driver do SQL Server) tirado do `requirements.txt` principal,
  já que trava a instalação em quem não precisa dele (fica em
  `requirements-mssql.txt`, opcional)
- `SECRET_KEY` agora tem um valor padrão de desenvolvimento, então o app
  não trava mais se o `.env` não existir
