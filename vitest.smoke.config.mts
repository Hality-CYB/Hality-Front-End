import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Smoke contra o back real, sem mock (`npm run smoke`). Fica fora do
 * `npm test` porque precisa do back rodando e de credenciais do seed.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["smoke/**/*.smoke.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
