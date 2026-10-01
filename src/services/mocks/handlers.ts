import { usuariosHandlers } from "@/services/mocks/usuarios-handlers";
import { pacientesHandlers } from "@/services/mocks/pacientes-handlers";
import { profissionaisHandlers } from "@/services/mocks/profissionais-handlers";
import { diagnosticosHandlers } from "@/services/mocks/diagnosticos-handlers";
import { anamneseHandlers } from "@/services/mocks/anamnese-handlers";
import { dicasHandlers } from "@/services/mocks/dicas-handlers";
import { authHandlers } from "@/services/mocks/auth-handlers";
import { homeHandlers } from "@/services/mocks/home-handlers";

/**
 * Todos os handlers de mock, compostos aqui. auth-service.ts não passa
 * por MSW pra login/registro: em modo mock (`apiMocking`), ele resolve
 * direto contra seed-data.ts, sem nem chamar `fetch`. A exceção é
 * `GET /users/me` (authHandlers) — RoleLayout chama isso de verdade via
 * apiClient pra descobrir quem está logado, então precisa de handler.
 */
export const handlers = [
  ...usuariosHandlers,
  ...pacientesHandlers,
  ...profissionaisHandlers,
  ...diagnosticosHandlers,
  ...anamneseHandlers,
  ...dicasHandlers,
  ...authHandlers,
  ...homeHandlers,
];
