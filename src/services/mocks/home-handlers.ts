import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { seedUsuarios, seedDiagnosticos, seedDicas } from "@/services/mocks/seed-data";
import { mapFrontendRoleToBackend } from "@/types/usuario";
import { nivelLabel } from "@/lib/level-format";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

export const homeHandlers = [
  http.get(url("/api/v1/home"), ({ request }) => {
    const auth = request.headers.get("authorization") ?? "";
    const usuarioId = auth.replace(/^Bearer mock-token:/, "");
    const usuario = seedUsuarios.find((u) => u.id === usuarioId);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    // Mesma simplificação de diagnosticos-handlers.ts: mock não segmenta
    // diagnóstico por paciente de verdade, todos pertencem a "paciente-1".
    const ultimo = [...seedDiagnosticos]
      .filter((d) => d.pacienteId === "paciente-1")
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
      dicas: seedDicas
        .filter((d) => d.publicado && d.mostrarNaHome)
        .sort((a, b) => a.ordem - b.ordem)
        .map((d, index) => ({
          id: index + 1,
          titulo: d.titulo,
          categoria: d.categoria,
          conteudo: { itens: [{ tipo: "texto", texto: d.corpo }] },
        })),
    });
  }),
];
