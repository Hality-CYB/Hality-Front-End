import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { nivelLabel } from "@/lib/level-format";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import { CLASSIFICACAO_ID_POR_NIVEL } from "@/services/mocks/mock-db";
import { CODIGO_POR_NIVEL, type DiagnosticoNivel } from "@/types/diagnostico";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

/** Mesmos ids 11-13 que os `classificacao_ids` dos conteúdos do mock. */
export const classificacoesMock = ([1, 2, 3] as DiagnosticoNivel[]).map((nivel) => ({
  id: CLASSIFICACAO_ID_POR_NIVEL[nivel],
  codigo: CODIGO_POR_NIVEL[nivel],
  nome_exibicao: nivelLabel(nivel),
  ordem: nivel,
}));

export const classificacoesHandlers = [
  // Qualquer usuário autenticado (GET /classificacoes do back).
  http.get(url("/api/v1/classificacoes"), ({ request }) => {
    if (!usuarioDoRequest(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(classificacoesMock);
  }),
];
