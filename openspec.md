# EduTrack — OpenSpec

## Resultado da verificação

Este projeto **não possui** uma estrutura OpenSpec. Verificado diretamente:

```
find . -iname "openspec*" -o -iname "AGENTS.md" -o -ipath "*specs/changes/archive*"
```

Não existe `openspec/`, `AGENTS.md` (na raiz ou em qualquer diretório do
projeto) nem `specs/changes/archive`. O único arquivo chamado `AGENTS.md`
encontrado está dentro de `frontend/node_modules/recharts/` — é um arquivo
interno do pacote `recharts` (dependência do projeto, não código do
EduTrack) e não tem relação com esta verificação.

## Contexto

Essa estrutura nunca foi criada neste projeto em nenhum momento do
desenvolvimento — desde a análise inicial do zip enviado até este ponto. Não
é algo que existia antes e foi perdido, nem algo que eu deveria ter criado e
não criei: simplesmente não faz parte do EduTrack.

Se a intenção era que o projeto tivesse documentação de specs/changes no
formato OpenSpec (um diretório `openspec/` com `project.md`, `specs/` por
capability e `changes/` com propostas ativas/arquivadas, convenção usada por
algumas equipes para manter agentes de IA alinhados com a especificação do
produto), isso **não existe aqui** e eu não criei nada se passando por essa
estrutura — preferi reportar a ausência em vez de inventar conteúdo.

## Documentação que existe de fato, cobrindo um papel parecido

| Precisa de... | Está em... |
|---|---|
| Visão geral do produto e stack | `README.md`, `LEIA-ME.md` |
| Especificação de dados | `data-dictionary.md` (novo, desta auditoria) |
| Especificação de API | `api-documentation.md` (novo, desta auditoria) |
| Decisões de arquitetura | comentários/docstrings no topo de cada model (`backend/app/models/*.py`) — especialmente `calendar_event.py` (recorrência) e `study_session.py` (rastreamento de tempo) |
| Estado de validação/testes | `crud-validation.md` (novo, desta auditoria) |
| Como rodar e testar | `GUIA_DE_EXECUCAO_E_TESTES.md` |

Se você quiser, posso criar uma estrutura `openspec/` de verdade a partir
desses documentos — mas isso é uma feature nova de processo, fora do escopo
desta rodada de auditoria/correção, então não fiz isso sem confirmação sua.
