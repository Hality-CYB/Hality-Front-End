# Contexto do projeto — Hality / CYB

> Este arquivo dá contexto de arquitetura e padrões pra quem entra no repo, e mantém um resumo do que foi desenvolvido antes de cada push importante. **Atualize a seção "Últimas atualizações" antes de dar push** com um resumo curto do que mudou — não é changelog de commit, é o essencial pra quem for revisar entender o que está entrando.

## Sobre o projeto

Check Your Breath (CYB) é o app da Hality Diagnóstico do Hálito: usa IA para apoiar o diagnóstico de halitose a partir de foto da língua + anamnese, para uso de pacientes e profissionais de saúde, com um painel administrativo para a equipe da Hality.

## Stack tecnológica

| Camada         | Tecnologia       |
| -------------- | ---------------- |
| Frontend       | React + Next.js  |
| Backend        | Python + FastAPI |
| Banco de dados | PostgreSQL       |

## Padrões de desenvolvimento

> Padrões definidos para os dois repositórios (frontend e backend), mantidos consistentes entre si. Detalhamento completo de cada um está no README do respectivo repo.

- **Branches permanentes:** `develop` (integração do dia a dia) e `main` (produção/release). Toda branch nova nasce de `develop` e volta via Pull Request.
- **Nome de branch:** `<tipo>/<descrição-curta-em-kebab-case>`, com três tipos:
  - `feature/` — algo novo que o sistema não fazia antes (ex.: `feature/cadastro-de-usuario`)
  - `fix/` — correção de comportamento que já existia e estava errado (ex.: `fix/token-nao-expira`)
  - `chore/` — não muda comportamento pra quem usa a aplicação: config, dependências, CI/CD, docs, formatação (ex.: `chore/atualizar-dependencias`)
- **Pull Requests:** obrigatórios pra mergear em `develop`/`main`; ao menos 1 revisão de outro membro do time antes do merge.
- **Frontend (ver `Hality-Front-End/README.md`):** Next.js (App Router) + TypeScript, arquitetura em camadas — `app/` (rotas) → `hooks/` (estado/efeitos) → `services/` (chamadas à API) → `lib/api-client.ts` (cliente HTTP), com `components/` (UI) e `types/` (contrato da API) como camadas de apresentação/dados. Lint com ESLint, formatação com Prettier, testes com Vitest + React Testing Library (`npm run lint` / `format` / `test`). Arquivos em kebab-case; um recurso = `services/<recurso>-service.ts` + `types/<recurso>.ts` + `hooks/use-<recurso>.ts` quando aplicável; testes ficam ao lado do arquivo testado (`<arquivo>.test.ts`).
- **Backend (ver `Hality-Back-End/README.md`):** arquitetura em camadas — `api/` (endpoints HTTP) → `services/` (regra de negócio) → `models/`/`db/` (persistência), com `schemas/` (Pydantic) validando entrada/saída. Gerenciado com `uv`, lint/format com `ruff`, testes com `pytest`. Arquivos Python em snake_case; um recurso = `api/v1/endpoints/<recurso>.py` + `services/<recurso>_service.py` + `models/<recurso>.py` + `schemas/<recurso>.py`.
- **Banco:** PostgreSQL; migrations versionadas com Alembic.

## Onde encontrar o que já foi decidido

- Requisitos funcionais/não funcionais e o mapa de telas por perfil (paciente/profissional/admin) estão documentados fora deste repo, na pasta de gestão do projeto — pedir acesso a quem está com a wiki/documentação da AGES.
- Fluxo de navegação de cada perfil já foi validado com o time antes do início do design das telas no Figma.

## Últimas atualizações

<!-- Adicionar uma entrada nova no topo antes de cada push relevante. Formato: data — resumo. -->

- **2026-09-02** — Fluxo do paciente (home, avaliação/diagnóstico, diagnósticos, dicas, perfil) portado do `Design/` e revisado tela por tela pra fidelidade visual real: modal virou bottom sheet (igual Design, não o dialog centralizado padrão do shadcn), grid responsivo (`.cyb-grid`) e breakpoint `shell:` (860px) aplicados nas listas e no wizard de avaliação, badges de status com cor por significado (`StatusBadge`), animações de transição de página/modal que tinham ficado pra trás, bug de navegação (item errado marcado como ativo no sidebar/bottom nav), e o loading da análise de IA que não aparecia. Usuário logado agora flui de verdade pela sessão (`useSessaoAtual()`) em vez de placeholders fixos nas telas. README documenta os padrões de UI/componentes, sessão e mock (MSW) que saíram dessa leva — ver `Hality-Front-End/README.md`. Profissional/admin ainda não passaram por essa mesma revisão de fidelidade.

- **2026-08-21** — Scaffold do frontend completo: Next.js + TypeScript + Tailwind, arquitetura em camadas (`app`/`hooks`/`services`/`lib`/`components`/`types`), ESLint + Prettier, testes com Vitest + React Testing Library (exemplo `use-health.test.ts`), CI no GitHub Actions (lint, testes e build em todo PR pra `develop`/`main`) e `.nvmrc` fixando a versão do Node. README do frontend documenta tudo. Backend (`Hality-Back-End`) já estava com scaffold pronto (FastAPI + uv + ruff + pytest) — os dois repos seguem os mesmos padrões de branch e CI.
