import { usuariosHandlers } from "@/services/mocks/usuarios-handlers";
import { pacientesHandlers } from "@/services/mocks/pacientes-handlers";
import { profissionaisHandlers } from "@/services/mocks/profissionais-handlers";
import { diagnosticosHandlers } from "@/services/mocks/diagnosticos-handlers";
import { anamneseHandlers } from "@/services/mocks/anamnese-handlers";
import { dicasHandlers } from "@/services/mocks/dicas-handlers";

/**
 * Todos os handlers de mock, compostos aqui. auth-service.ts não passa
 * por MSW: em modo mock (`apiMocking`), ele resolve login/registro direto
 * contra seed-data.ts, sem nem chamar `fetch` — não tem requisição pro MSW
 * interceptar.
 */
export const handlers = [
  ...usuariosHandlers,
  ...pacientesHandlers,
  ...profissionaisHandlers,
  ...diagnosticosHandlers,
  ...anamneseHandlers,
  ...dicasHandlers,
];
