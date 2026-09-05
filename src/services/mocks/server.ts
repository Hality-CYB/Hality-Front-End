import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Servidor do MSW pros testes (Vitest) — mesmos handlers do navegador. */
export const server = setupServer(...handlers);
