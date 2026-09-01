import { usuariosHandlers } from "@/services/mocks/usuarios-handlers";
import { pacientesHandlers } from "@/services/mocks/pacientes-handlers";
import { profissionaisHandlers } from "@/services/mocks/profissionais-handlers";
import { diagnosticosHandlers } from "@/services/mocks/diagnosticos-handlers";
import { anamneseHandlers } from "@/services/mocks/anamnese-handlers";
import { dicasHandlers } from "@/services/mocks/dicas-handlers";

/**
 * Todos os handlers de mock, compostos aqui. auth-service.ts não passa
 * por MSW — ver o comentário em lib/auth/session.ts: as rotas de auth são
 * chamadas de dentro de app/api/auth/*, que roda no servidor Next (não no
 * navegador), então o service worker do MSW não intercepta essas chamadas
 * mesmo. Em modo mock, essas rotas validam direto contra seed-data.ts.
 */
export const handlers = [
  ...usuariosHandlers,
  ...pacientesHandlers,
  ...profissionaisHandlers,
  ...diagnosticosHandlers,
  ...anamneseHandlers,
  ...dicasHandlers,
];
