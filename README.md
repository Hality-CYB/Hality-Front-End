# hality-front

Frontend em Next.js (React + TypeScript), gerenciado com npm.

## Sumário

- [Como iniciar o projeto](#como-iniciar-o-projeto)
- [Arquitetura](#arquitetura)
- [Detalhamento](#detalhamento)
- [Convenções](#convenções)
- [UI, componentes e fidelidade com o Design/](#ui-componentes-e-fidelidade-com-o-design)
- [Sessão / usuário logado](#sessão--usuário-logado)
- [Mock da API (MSW)](#mock-da-api-msw)

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
    page.tsx                     # Land Page real (rota "/")
    globals.css
    providers.tsx                # "use client" — QueryClientProvider
    proxy.ts                     # gate otimista de rota por papel (ver seção de sessão)
    (auth)/                      # /login, /registro, /esqueci-senha, /redefinir-senha
    paciente/  profissional/  admin/
      layout.tsx                 # Server Component: verifySession() + AppShell
      page.tsx                   # Home do papel
      .../page.tsx                # demais telas do papel
    api/auth/
      login/route.ts  logout/route.ts  register/route.ts
  components/
    ui/                          # primitivas shadcn, restilizadas com os tokens CYB
    layout/                      # AppShell, Sidebar, TopBar, BottomNav, RoleLayout
    <componente>.tsx              # componentes compartilhados entre papéis
  hooks/
    use-<recurso>.ts
  lib/
    config.ts  api-client.ts  utils.ts
    level-format.ts  role-format.ts  date-period.ts  nav-items.ts
    auth/
      session.ts                 # DAL server-only da sessão (JWT em cookie httpOnly)
      session-context.tsx        # useSessaoAtual() — ver seção de sessão
  services/
    <recurso>-service.ts
    mocks/                       # handlers + seed data do MSW
  types/
    <recurso>.ts
public/
assets/images/                   # logos/ícones importados via next/image
.github/
  workflows/
    ci-pipeline.yml
.env.example
.nvmrc
vitest.config.mts
vitest.setup.ts
```

- **`src/app/layout.tsx`** — layout raiz da aplicação (fontes via `next/font`, `<html>`/`<body>`, `providers.tsx`).

- **`src/app/page.tsx`** — rota `/`, a Land Page real (porta `Design/src/components/LandingPage.tsx`).

- **`src/app/globals.css`** — tokens de tema (`@theme`), reset, animações (`page-enter`/`modal-sheet`/…) e utilitários globais como `.cyb-grid`. Ver [UI, componentes e fidelidade com o Design/](#ui-componentes-e-fidelidade-com-o-design).

- **`src/app/proxy.ts`** — Next 16 renomeou Middleware pra Proxy; é o gate _otimista_ de rota por papel (redireciona `/paciente`, `/profissional`, `/admin` com base no JWT, sem round-trip ao backend). Não é a barreira de segurança real — isso é reforçado em cada `app/<role>/layout.tsx` e, no fim, em cada endpoint do backend.

- **`src/app/<role>/layout.tsx`** (`paciente`/`profissional`/`admin`) — Server Component fino: só chama `<RoleLayout role="...">` (`components/layout/role-layout.tsx`), que verifica a sessão, redireciona se não bater o papel, e monta o `AppShell` (sidebar/topbar/bottomnav) em volta da tela.

- **`src/components/ui/`** — primitivas do shadcn (`button.tsx`, `dialog.tsx`, `card.tsx`, ...), sempre restilizadas com os tokens da marca — nunca ficam com a aparência padrão do shadcn. Ver [UI, componentes e fidelidade com o Design/](#ui-componentes-e-fidelidade-com-o-design).

- **`src/components/layout/`** — casco do app por papel (`AppShell`, `Sidebar`, `TopBar`, `BottomNav`) e o `RoleLayout` que os monta.

- **`src/components/`** (raiz) — componentes compartilhados entre papéis, compostos sobre `components/ui/` (ex.: `status-badge.tsx`, `avatar-with-role.tsx`, `about-dialog.tsx`).

- **`src/hooks/`** — hooks React customizados, ligando `services/` ao ciclo de vida de um componente (estado, efeitos, TanStack Query). Um por recurso (`use-diagnosticos.ts`, `use-dicas.ts`, ...), seguindo o padrão de `use-health.ts` + `use-health.test.ts`.

- **`src/lib/config.ts`** — configuração da aplicação lida via variáveis de ambiente (`.env`).

- **`src/lib/api-client.ts`** — cliente HTTP fino sobre `fetch`; único ponto do frontend que conhece a URL base da API. `services/` chamam este cliente — nunca `fetch` diretamente.

- **`src/lib/level-format.ts` / `role-format.ts` / `date-period.ts` / `nav-items.ts`** — lógica pequena e reaproveitada entre os 3 papéis (cor/rótulo de nível de diagnóstico, cor/rótulo de papel de usuário, filtro de período, itens de navegação). Existiam duplicados (às vezes com pequenas diferenças acidentais) em cada um dos 3 apps do `Design/` original — aqui é uma implementação só. Se for mexer em algo assim, mexe aqui, não copia pra dentro da tela.

- **`src/lib/auth/session.ts`** — DAL (_data-access layer_) server-only da sessão: cria/verifica o JWT (`jose`) guardado num cookie httpOnly, e é o único lugar que faz isso — nada mais deve reimplementar essa checagem. `import "server-only"` garante que o build quebra se isso vazar pra um Client Component.

- **`src/lib/auth/session-context.tsx`** — `useSessaoAtual()`. Ver [Sessão / usuário logado](#sessão--usuário-logado).

- **`src/services/`** — funções que chamam o backend através do `api-client`, uma por recurso (ex.: `auth-service.ts`, `diagnostico-service.ts`).

- **`src/services/mocks/`** — handlers e dados de seed do MSW (Mock Service Worker). Ver [Mock da API (MSW)](#mock-da-api-msw).

- **`src/types/`** — tipos TypeScript (com schema `zod` ao lado) que espelham o contrato de entrada/saída da API — **contrato proposto**, já que o backend ainda não publicou o real (só tem `/health`). Um arquivo por recurso.

- **`public/`** — assets estáticos servidos diretamente pela raiz do site (favicon etc.).

- **`src/assets/images/`** — imagens importadas via `next/image` (logos, ícones) — diferente de `public/`, essas passam pela otimização/hashing do Next.

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

## UI, componentes e fidelidade com o Design/

O visual do app inteiro vem de um protótipo Figma Make (`Design/`, outro repo/pasta do projeto — não faz parte deste). **`Design/` é a fonte da verdade visual**: antes de construir ou corrigir uma tela, compare direto com o componente correspondente por lá (`Design/src/components/PatientApp.tsx`, `ProfessionalApp.tsx`, `AdminApp.tsx`, `shared/UI.tsx`) em vez de reinventar em cima do que o shadcn faz "por padrão" — foi exatamente aí que a maior parte do retrabalho desta primeira leva de telas aconteceu.

- **`components/ui/` são primitivas do shadcn, sempre restilizadas** — nunca ficam com a cara padrão do shadcn/Radix. Isso vale principalmente pro `Dialog`: no `Design/`, **todo modal é um bottom sheet** (sobe de baixo, cantos arredondados só em cima, puxador no topo), em qualquer tamanho de tela — não existe a versão "dialog centralizado com zoom" que o shadcn usa por padrão. `components/ui/dialog.tsx` já implementa isso; não crie modal novo sem reusar esse componente.
- **Inputs de texto cru** (não os de dentro de formulários do shadcn) seguem o estilo do `Design/`'s `Input`/inputs inline: borda `1.5px solid var(--border)`, `rounded-xl`, padding `14px`, sem o visual pequeno/fino do `<Input>` do shadcn. Se uma tela tiver um campo de texto que "não bate" com o Design, é provável que esteja usando o `Input` genérico em vez de replicar o estilo cru.
- **Badges de status com cor por significado** (nível de diagnóstico, papel de usuário, etc.) usam `components/status-badge.tsx` — **não** o `Badge` genérico de `components/ui/badge.tsx`, que só tem uma variante sólida sem esse mapeamento de cor.
- **Grid responsivo**: listas/cards que devem virar múltiplas colunas em telas largas usam a classe `.cyb-grid` (definida em `globals.css`) — coluna única abaixo de `--breakpoint-shell`, grid `auto-fill` acima. Não reinvente isso com `grid-cols-*` direto na tela.
- **Breakpoint próprio `shell:`** (860px, `--breakpoint-shell` em `globals.css`) — é o ponto onde o app troca do layout "frame de celular" (coluna única, bottom nav) pro layout desktop (sidebar + conteúdo largo), replicando o breakpoint que já era validado no `Design/`. Use `shell:` em vez de `md:`/`lg:` do Tailwind pra qualquer ajuste que dependa desse layout mudar (ex.: `shell:flex-row`, `shell:max-w-135`).
- **Animações**: `.page-enter` (troca de rota), `.modal-sheet`/`.modal-backdrop` (abertura de modal) — definidas em `globals.css`, portadas do `index.css` do `Design/`. Se uma tela nova "parece estática" comparado ao Design, provavelmente falta aplicar uma dessas classes.

## Sessão / usuário logado

Cada `app/<role>/layout.tsx` verifica a sessão no servidor (`lib/auth/session.ts`) e expõe o usuário logado pro resto da árvore via `SessaoProvider`. Dentro de qualquer página/componente cliente sob `app/paciente/`, `app/profissional/` ou `app/admin/`, use:

```ts
import { useSessaoAtual } from "@/lib/auth/session-context";

const { id, nome, email, role } = useSessaoAtual();
```

**Não hardcode `id`/`nome` de usuário numa página** (ex.: `const PACIENTE_ID_PLACEHOLDER = "paciente-1"`) — isso já existiu em várias telas na primeira leva do port e é exatamente o tipo de coisa que quebra silenciosamente quando o backend de auth de verdade entrar. Se uma tela precisa saber quem está logado, `useSessaoAtual()` é o único lugar certo pra isso.

## Mock da API (MSW)

Enquanto o backend (`Hality-Back-End`) não publica endpoints reais além de `/health`, o app roda contra o [Mock Service Worker](https://mswjs.io/) — os `services/*.ts` chamam o `apiClient` normalmente, e o MSW intercepta a requisição no navegador e responde com os dados de `services/mocks/seed-data.ts`. Isso significa que trocar mock por API real depois é só desligar o MSW (`NEXT_PUBLIC_API_MOCKING=disabled` em `.env`) — nenhum código de tela ou hook deveria precisar mudar.

Uma exceção conhecida: `app/api/auth/*` roda no servidor (Route Handlers), onde o MSW de navegador não intercepta nada — por isso essas rotas leem `seed-data.ts` diretamente quando `NEXT_PUBLIC_API_MOCKING` está ligado, em vez de passar pelo `apiClient`/MSW. Está comentado no próprio arquivo (`app/api/auth/login/route.ts`).
