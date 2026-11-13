import { defineConfig, devices } from "@playwright/test";

// https://playwright.dev/docs/test-configuration

// Afirmam estado compartilhado: contagem, resumo, conteúdo publicado ou snapshot do seed.
const globais = [
  /google\/google\.spec\.ts/,
  /admin-usuarios\/admin-usuarios\.spec\.ts/,
  /resumos\/resumos\.spec\.ts/,
  /conteudo\/conteudo\.spec\.ts/,
  /conteudo-midia\/conteudo-midia\.spec\.ts/,
  /avaliacao-erros\/avaliacao-erros\.spec\.ts/,
];

const chromium = { ...devices["Desktop Chrome"] };

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 30_000,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: `http://localhost:${process.env.E2E_FRONT_PORT || "3000"}`,
    headless: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    serviceWorkers: "block",
    trace: "on",
    screenshot: "on",
    video: "off",
  },
  projects: [
    {
      name: "isolado",
      fullyParallel: true,
      testIgnore: globais,
      use: chromium,
    },
    {
      name: "global",
      fullyParallel: false,
      workers: 1,
      dependencies: ["isolado"],
      testMatch: globais,
      use: chromium,
    },
  ],
});
