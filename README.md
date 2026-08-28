# hality-front

Frontend em Next.js (React + TypeScript), gerenciado com npm.

## Sumário

- [Como iniciar o projeto](#como-iniciar-o-projeto)
- [Arquitetura](#arquitetura)
- [Detalhamento](#detalhamento)
- [Convenções](#convenções)

## Como iniciar o projeto

### Requisitos

- Node.js 20+ (a versão exata está fixada em `.nvmrc` — rode `nvm use` se usar o `nvm`)
- npm

### Passo a passo (depois do clone)

```bash
# 1. entrar na pasta do projeto
cd hality-front-end

# 2. instalar as dependências
npm install

# 3. copiar o arquivo de variáveis de ambiente
cp .env.example .env

# 4. subir o servidor em modo desenvolvimento (reload automático)
npm run dev
```

A aplicação sobe em http://localhost:3000. O backend (`Hality-Back-End`) precisa estar rodando em paralelo (por padrão em http://localhost:8000) — veja `NEXT_PUBLIC_API_URL` em `.env`.

### Outros comandos úteis

```bash
# build de produção
npm run build

# rodar o build de produção localmente
npm run start

# lint
npm run lint

# formatar o código
npm run format

# só checar formatação, sem alterar arquivos (útil em CI)
npm run format:check

# rodar os testes uma vez
npm run test

# rodar os testes em modo watch (reexecuta ao salvar)
npm run test:watch

# rodar os testes com relatório de cobertura
npm run test:coverage
```

> No VS Code, instale as extensões recomendadas em `.vscode/extensions.json` (Prettier + ESLint) — o `.vscode/settings.json` já está configurado para formatar automaticamente ao salvar.

Todo Pull Request pra `develop`/`main` roda lint, testes e build automaticamente via GitHub Actions (`.github/workflows/ci-pipeline.yml`) — rode os mesmos comandos localmente antes de abrir o PR pra não ser pego de surpresa.

## Arquitetura

O projeto segue uma organização **por camada** (horizontal): os arquivos são agrupados pelo _tipo_ de responsabilidade que têm, não pelo domínio/feature a que pertencem. Toda rota fica em `app/`, todo componente de UI em `components/`, toda chamada à API em `services/`, e assim por diante — independente de ser sobre "usuário", "diagnóstico" etc.

Fluxo de uma tela que busca dados do backend:

```
Rota (app/) → hook (hooks/) → service (services/) → api-client (lib/) → Backend
                  ↓                    ↓
            componente (components/)  tipo (types/)
            recebe os dados            formata o dado
            e renderiza                trocado com a API
```

- **app** é o único lugar que conhece rotas/URLs (é o roteador de arquivos do Next.js). Não deve ter lógica de negócio nem chamada direta a `fetch`.
- **services** concentra as chamadas à API e qualquer lógica de transformação de dados que não dependa do React — poderia, em teoria, ser reaproveitado fora de um componente.
- **hooks** conecta `services` ao ciclo de vida do React (estado, efeitos). É a camada que _sabe_ que está rodando dentro de um componente.
- **components** e **types** são propositalmente separados dos dados: `components` só recebe props e renderiza; `types` é o formato dos dados trafegados com a API — nem sempre é igual ao que é exibido na tela.

Por que não tem pasta `pages/`: o projeto usa o **App Router** do Next.js (`src/app/`), que já cumpre esse papel — cada pasta dentro de `app/` vira uma rota automaticamente.

Testes ficam ao lado do arquivo que testam (`<arquivo>.test.ts(x)`), não numa pasta `tests/` separada — assim é óbvio quando um arquivo está sem cobertura.

## Detalhamento

```
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
  hooks/
    use-health.ts
    use-health.test.ts
  lib/
    config.ts
    api-client.ts
  services/
  types/
    health.ts
public/
.github/
  workflows/
    ci-pipeline.yml
.env.example
.nvmrc
vitest.config.mts
vitest.setup.ts
```

- **`src/app/layout.tsx`** — layout raiz da aplicação (fontes, `<html>`/`<body>`, providers globais quando existirem).

- **`src/app/page.tsx`** — rota `/`. Ainda é o template padrão gerado pelo `create-next-app` — será substituída pela Land Page real, conforme o mapa de telas já validado com o time.

- **`src/app/globals.css`** — estilos globais e diretivas do Tailwind CSS.

- **`src/components/`** — componentes de UI reutilizáveis, sem chamada de API. Ainda vazia — será populada conforme as telas forem construídas (ex.: `components/button.tsx`, `components/tongue-photo-frame.tsx`).

- **`src/hooks/`** — hooks React customizados, ligando `services/` ao ciclo de vida de um componente (estado, efeitos). Contém `use-health.ts` como exemplo de padrão, com seu teste em `use-health.test.ts`.

- **`src/lib/config.ts`** — configuração da aplicação lida via variáveis de ambiente (`.env`).

- **`src/lib/api-client.ts`** — cliente HTTP fino sobre `fetch`; único ponto do frontend que conhece a URL base da API. `services/` chamam este cliente — nunca `fetch` diretamente.

- **`src/services/`** — funções que chamam o backend através do `api-client`, uma por recurso (ex.: `auth-service.ts`, `diagnostico-service.ts`). Ainda vazia — será populada quando as telas passarem a consumir a API de verdade.

- **`src/types/`** — tipos TypeScript que espelham o contrato de entrada/saída da API. Contém `health.ts` como exemplo, referente ao `GET /api/v1/health`.

- **`public/`** — assets estáticos (imagens, ícones) servidos diretamente pela raiz do site.

- **`.env.example`** — modelo de variáveis de ambiente; copie para `.env` (que fica fora do git) antes de rodar o projeto.

- **`.vscode/`** — `settings.json` (format on save com Prettier + fix automático do ESLint) e `extensions.json` (extensões recomendadas).

- **`.prettierrc.json`** — configuração do Prettier, incluindo o plugin que ordena classes do Tailwind automaticamente.

- **`eslint.config.mjs`** — regras de lint (`eslint-config-next` + `eslint-config-prettier`, para o ESLint nunca brigar com o Prettier em regra de formatação).

- **`vitest.config.mts`** / **`vitest.setup.ts`** — configuração do Vitest (ambiente `jsdom`, alias `@/`) e o setup global dos testes (`@testing-library/jest-dom`).

- **`.nvmrc`** — versão do Node.js usada no projeto, pra todo mundo (e o CI) rodar a mesma versão.

- **`.github/workflows/ci-pipeline.yml`** — pipeline do GitHub Actions: lint + format check, testes e build, rodando em todo Pull Request pra `develop`/`main`.

## Convenções

### Padrão de branches

O repo tem duas branches "permanentes": `develop` (onde o time integra o trabalho do dia a dia) e `main` (produção/release). Toda branch nova nasce a partir da `develop` e volta pra ela via Pull Request.

O nome segue o formato:

```
<tipo>/<descrição-curta-em-kebab-case>
```

- **kebab-case** = tudo minúsculo, palavras separadas por hífen, sem acento e sem espaço (ex.: `tela-de-login`, não `Tela De Login`).
- A descrição deve dizer _o quê_, de forma curta — não precisa repetir o tipo nem detalhar o "como".

Os três tipos e quando usar cada um:

| Tipo       | Quando usar                                                                                                                                                          | Exemplos                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `feature/` | Algo novo — uma tela ou funcionalidade que o sistema **não tinha antes** e passa a ter.                                                                              | `feature/tela-de-login`, `feature/captura-de-foto`, `feature/lista-diagnosticos`     |
| `fix/`     | Correção de um **comportamento que já existia mas estava errado** (bug).                                                                                             | `fix/formulario-nao-valida-email`, `fix/imagem-nao-carrega-no-safari`                |
| `chore/`   | Tudo que **não muda o comportamento da aplicação para quem usa** — configuração, dependências, CI/CD, documentação, formatação, refatoração sem mudar comportamento. | `chore/atualizar-dependencias`, `chore/configurar-eslint`, `chore/documentar-readme` |

**Como diferenciar `fix/` de `chore/` na prática:** pergunte "isso corrige um bug que afeta o que o usuário vê/faz na aplicação?". Se sim → `fix/`. Se é manutenção/organização que não muda o comportamento (ex.: trocar versão de uma lib, ajustar `.gitignore`, mexer no workflow de CI) → `chore/`.

### Padrão de nomenclatura de arquivos

Arquivos e pastas em **kebab-case** (tudo minúsculo, palavras separadas por `-`), com exceção dos arquivos que o próprio Next.js exige com nome fixo (`layout.tsx`, `page.tsx`, `globals.css`) e dos componentes React, que usam **PascalCase** só no nome do componente exportado (o arquivo continua em kebab-case).

- **`src/app/<rota>/page.tsx`** — cada pasta dentro de `app/` vira uma rota; o arquivo `page.tsx` é o conteúdo dessa rota (convenção fixa do Next.js App Router).
- **`src/components/<nome-do-componente>.tsx`** — kebab-case no arquivo, `PascalCase` no componente exportado (ex.: `components/tongue-photo-frame.tsx` exporta `TonguePhotoFrame`).
- **`src/services/<recurso>-service.ts`** — nome do recurso + sufixo `-service`, deixando explícito que é a camada que fala com a API (ex.: `auth-service.ts`, `diagnostico-service.ts`).
- **`src/hooks/use-<algo>.ts`** — prefixo `use-`, seguindo a convenção de hooks do React (ex.: `use-health.ts` exporta `useHealth`).
- **`src/types/<recurso>.ts`** — mesmo nome do recurso; dentro do arquivo ficam as interfaces/types relacionados (ex.: `types/diagnostico.ts` define `Diagnostico`, `DiagnosticoNivel`, etc.).
- **`<arquivo>.test.ts` / `<arquivo>.test.tsx`** — teste do arquivo de mesmo nome, na mesma pasta (ex.: `use-health.test.ts` testa `use-health.ts`). É essa nomenclatura que o Vitest usa para descobrir os testes automaticamente.
- **Arquivos de configuração na raiz** (`package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `next.config.ts`) usam o nome exato que a ferramenta correspondente exige — não seguem a convenção kebab-case do projeto.
