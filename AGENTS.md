# EduTrack — fluxo de trabalho

- Leia a implementação antes de alterar e preserve o que já funciona.
- Separe regras de negócio, serviços/API e apresentação. Reutilize entidades e componentes existentes; evite dependências e reescritas sem necessidade.
- Faça commits pequenos e descritivos ao concluir unidades coerentes das atualizações solicitadas. Separe funcionalidades, correções e documentação quando forem independentes. Não deixe toda a implementação acumular em um único commit.
- Antes de cada commit, revise o diff e inclua somente arquivos intencionais. Preserve alterações do usuário. Nunca faça push sem solicitação explícita.
- Não versione bancos locais, `.env`, backups ou credenciais. Versione migrations e teste a preservação dos dados antes de aplicá-las em banco real.
- Valide frontend com type-check/build e testes relevantes. Para API/model/migrations, execute testes backend correspondentes e a suíte completa quando houver mudanças transversais.
- Mantenha `docs/DEVELOPMENT_STATUS.md` fiel ao código: implementação, validações realizadas, limitações reais e próximas prioridades.
- Respeite teclado, estados de loading/erro/vazio, temas claro/escuro, responsividade e `prefers-reduced-motion`.
