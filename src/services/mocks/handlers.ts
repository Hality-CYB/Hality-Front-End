import { authHandlers } from "@/services/mocks/auth-handlers";
import { usuariosHandlers } from "@/services/mocks/usuarios-handlers";
import { pacientesHandlers } from "@/services/mocks/pacientes-handlers";
import { profissionaisHandlers } from "@/services/mocks/profissionais-handlers";
import { diagnosticosHandlers } from "@/services/mocks/diagnosticos-handlers";
import { anamneseHandlers } from "@/services/mocks/anamnese-handlers";
import { dicasHandlers } from "@/services/mocks/dicas-handlers";

export const handlers = [
  ...authHandlers,
  ...usuariosHandlers,
  ...pacientesHandlers,
  ...profissionaisHandlers,
  ...diagnosticosHandlers,
  ...anamneseHandlers,
  ...dicasHandlers,
];
