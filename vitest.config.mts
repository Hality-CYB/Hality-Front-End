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
    // Next, não do Vite). Os testes usam o servidor MSW de node direto
    // (services/mocks/server.ts), então o app fica no caminho real:
    // auth-service.test.ts, por exemplo, mocka fetch para testar esse caminho.
    env: { NEXT_PUBLIC_API_MOCKING: "disabled" },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
