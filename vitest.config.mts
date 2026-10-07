import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["node_modules", ".next", "e2e"],
    // Vitest não carrega o .env do Next (isso é feature do bundler do
    // Next, não do Vite) — sem isso, `config.apiMocking` sempre cai no
    // fallback "enabled" dentro dos testes, e auth-service.test.ts (que
    // mocka fetch pra testar o caminho real) nunca exercita o código que
    // diz testar.
    env: { NEXT_PUBLIC_API_MOCKING: "disabled" },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
