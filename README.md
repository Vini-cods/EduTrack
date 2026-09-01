# EduTrack

EduTrack é um sistema de gestão educacional para organizar disciplinas, tarefas, atividades e acompanhamento do desempenho acadêmico. A plataforma permite que estudantes acompanhem matérias, visualizem progresso em dashboards e gerenciem pendências de forma centralizada.

## Visão geral

O projeto foi estruturado em duas partes:

- Backend em Python com FastAPI para autenticação, regras de negócio e APIs REST
- Frontend em React com TypeScript para interface web responsiva e navegação entre telas

A aplicação tem foco em produtividade acadêmica, com autenticação de usuários, listagem de matérias, registro de tarefas e visão geral de indicadores.

## Stack utilizada

### Frontend
- React
- TypeScript
- Vite
- React Router DOM
- Axios
- Recharts
- React Hook Form
- Zod
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- SQLite
- JWT com Python-Jose
- Passlib + BCrypt

## Linguagens principais

- Python
- TypeScript
- SQL
- HTML
- CSS

## Estrutura do projeto

- backend/: API REST, modelos, schemas, serviços e configuração do banco
- frontend/: aplicação web em React com componentes, páginas e contexto de autenticação
- README.md: documentação do projeto

## Como executar

### Backend

1. Acesse a pasta backend
2. Crie um ambiente virtual
3. Instale as dependências:

   pip install -r requirements.txt

4. Inicie a aplicação:

   uvicorn app.main:app --reload

### Frontend

1. Acesse a pasta frontend
2. Instale as dependências:

   npm install

3. Inicie o ambiente de desenvolvimento:

   npm run dev

## Funcionalidades principais

- Cadastro e login de usuários
- Gestão de matérias/disciplinas
- Cadastro e organização de tarefas
- Dashboard com visão geral do progresso
- Visualização de detalhes por disciplina
- Recuperação de senha
- Autenticação via token JWT

## Observações

O projeto usa SQLite como banco de dados local no backend e foi organizado para facilitar a evolução com novas funcionalidades, como relatórios, notificações e integração com outras ferramentas acadêmicas.
