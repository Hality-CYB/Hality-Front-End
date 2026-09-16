/**
 * Configuração da aplicação lida a partir de variáveis de ambiente.
 * Equivalente ao `app/core/config.py` do backend (fonte única da verdade
 * para valores vindos do `.env`).
 *
 * Importante: cada `process.env.NEXT_PUBLIC_*` abaixo tem que aparecer
 * como acesso estático (`process.env.NOME_LITERAL`), não dinâmico
 * (`process.env[nome]`). O Next só inlina no bundle do navegador as
 * variáveis que consegue reconhecer assim em tempo de build — acesso
 * dinâmico sempre lê `undefined` no client e cai no fallback, mesmo com o
 * `.env` configurado certo (foi o que aconteceu aqui: `apiMocking` nunca
 * desligava, porque cada leitura passava por uma função com `process.env[name]`).
 */

export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  apiMocking: (process.env.NEXT_PUBLIC_API_MOCKING ?? "enabled") === "enabled",
} as const;
