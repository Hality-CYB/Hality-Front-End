import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";

import { conteudosMock, usuariosMock } from "@/services/mocks/mock-db";
import { diagnosticosMock, PACIENTE_MOCK_ID } from "@/services/mocks/mock-db";
import { mapFrontendRoleToBackend } from "@/types/usuario";
import { nivelLabel } from "@/lib/level-format";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

export const homeHandlers = [
  http.get(url("/api/v1/home"), ({ request }) => {
    const auth = request.headers.get("authorization") ?? "";
    const usuarioId = auth.replace(/^Bearer mock-token:/, "");
    const usuario = usuariosMock.find((u) => u.id === usuarioId);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    // Mesma simplificação de diagnosticos-handlers.ts: mock não segmenta
    // diagnóstico por paciente de verdade, todos pertencem a "paciente-1".
    const ultimo = [...diagnosticosMock]
      .filter((d) => d.pacienteId === PACIENTE_MOCK_ID)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())[0];

    return HttpResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        tipo_usuario: mapFrontendRoleToBackend(usuario.role),
      },
      ultimo_diagnostico: ultimo
        ? {
            id: Number(ultimo.id.replace(/\D/g, "")),
            data_diagnostico: ultimo.criadoEm,
            status: ultimo.status,
            classificacao:
              ultimo.nivel !== null
                ? { codigo: `nivel_${ultimo.nivel}`, nome_exibicao: nivelLabel(ultimo.nivel) }
                : null,
            escala_saburra: null,
          }
        : null,
      // Mesmos conteúdos que o admin edita em /admin/conteudos.
      dicas: conteudosMock
        .filter((c) => c.status === "publicado" && c.aparece_na_home)
        .sort((a, b) => a.ordem - b.ordem)
        .map((c) => ({
          id: c.id,
          titulo: c.titulo,
          categoria: c.categoria,
          conteudo: c.conteudo,
        })),
    });
  }),
];
