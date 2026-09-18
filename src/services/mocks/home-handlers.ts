import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { seedDiagnosticos, seedDicas, seedUsuarios } from "@/services/mocks/seed-data";
import { mapFrontendRoleToBackend } from "@/types/usuario";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

const CLASSIFICACAO_POR_NIVEL: Record<
  1 | 2 | 3,
  { codigo: string; nome_exibicao: string; escala: number }
> = {
  1: { codigo: "saudavel", nome_exibicao: "Saudável", escala: 15 },
  2: { codigo: "halitose_social", nome_exibicao: "Halitose Social", escala: 50 },
  3: { codigo: "halitose_severa", nome_exibicao: "Halitose Severa", escala: 80 },
};

export const homeHandlers = [
  http.get(url("/api/v1/home"), ({ request }) => {
    const auth = request.headers.get("authorization") ?? "";
    const usuarioId = auth.replace(/^Bearer mock-token:/, "");
    const usuario = seedUsuarios.find((u) => u.id === usuarioId) ?? seedUsuarios[0]!;

    const diagnosticosPaciente = seedDiagnosticos.filter((d) => d.pacienteId === usuario.id);
    const ultimoConcluido = diagnosticosPaciente
      .filter((d) => d.status === "concluido" && d.nivel !== null)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())[0];

    return HttpResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        tipo_usuario: mapFrontendRoleToBackend(usuario.role),
      },
      total_diagnosticos: diagnosticosPaciente.length,
      avisos_nao_lidos: 0,
      ultimo_diagnostico: ultimoConcluido
        ? {
            id: Number(ultimoConcluido.id.replace(/\D/g, "")),
            data_diagnostico: ultimoConcluido.criadoEm,
            status: ultimoConcluido.status,
            classificacao: {
              codigo: CLASSIFICACAO_POR_NIVEL[ultimoConcluido.nivel as 1 | 2 | 3].codigo,
              nome_exibicao:
                CLASSIFICACAO_POR_NIVEL[ultimoConcluido.nivel as 1 | 2 | 3].nome_exibicao,
            },
            escala_saburra: CLASSIFICACAO_POR_NIVEL[ultimoConcluido.nivel as 1 | 2 | 3].escala,
          }
        : null,
      total_dicas: seedDicas.filter((d) => d.publicado).length,
      dicas: seedDicas
        .filter((d) => d.publicado && d.mostrarNaHome)
        .map((d, index) => ({ id: index + 1, titulo: d.titulo, conteudo: d.corpo })),
    });
  }),
];
