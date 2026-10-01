import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import {
  diagnosticosMock,
  maisRecentesPrimeiro,
  nomeDoUsuario,
  pacientesMock,
  paginar,
  paraBackendListItem,
  vinculadoEmMock,
} from "@/services/mocks/mock-db";
import type { Paciente } from "@/types/paciente";
import type { Usuario } from "@/types/usuario";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

/** Espelha `paciente_service.listar_pacientes` da PR #97: profissional vê só os vinculados, admin vê todos. */
function visiveisPara(usuario: Usuario): Paciente[] {
  if (usuario.role === "admin") return pacientesMock;
  return pacientesMock.filter((p) => p.profissionalVinculadoId === usuario.id);
}

function paraBackendListItemPaciente(paciente: Paciente) {
  const diags = diagnosticosMock
    .filter((d) => d.pacienteId === paciente.id)
    .sort(maisRecentesPrimeiro);
  const ultimo = diags[0];
  return {
    id: paciente.id,
    nome: paciente.nome,
    email: paciente.email,
    telefone: paciente.telefone || null,
    ativo: true,
    total_diagnosticos: diags.length,
    ultimo_diagnostico_em: ultimo?.criadoEm ?? null,
    ultimo_nivel: ultimo?.nivel ?? null,
  };
}

function acessoNegado(usuario: Usuario) {
  if (usuario.role !== "profissional" && usuario.role !== "admin") {
    return HttpResponse.json(
      { detail: "acesso restrito a profissionais e administradores" },
      { status: 403 },
    );
  }
  return null;
}

export const pacientesHandlers = [
  http.get(url("/api/v1/pacientes"), ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    const negado = acessoNegado(usuario);
    if (negado) return negado;

    const params = new URL(request.url).searchParams;
    const busca = params.get("busca")?.trim().toLowerCase();
    const pagina = Number(params.get("pagina") ?? 1);
    const limite = Number(params.get("limite") ?? 20);

    const filtrados = visiveisPara(usuario)
      .filter(
        (p) =>
          !busca || p.nome.toLowerCase().includes(busca) || p.email.toLowerCase().includes(busca),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return HttpResponse.json(paginar(filtrados.map(paraBackendListItemPaciente), pagina, limite));
  }),

  http.get(url("/api/v1/pacientes/:id"), ({ params, request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    const negado = acessoNegado(usuario);
    if (negado) return negado;

    // Sem vínculo responde 404, igual a paciente inexistente (não revela ids).
    const paciente = visiveisPara(usuario).find((p) => p.id === params.id);
    if (!paciente) return HttpResponse.json({ detail: "paciente não encontrado" }, { status: 404 });

    const searchParams = new URL(request.url).searchParams;
    const pagina = Number(searchParams.get("pagina") ?? 1);
    const limite = Number(searchParams.get("limite") ?? 20);
    const diagnosticos = diagnosticosMock
      .filter((d) => d.pacienteId === paciente.id)
      .sort(maisRecentesPrimeiro)
      .map((d) => paraBackendListItem(d));
    const vinculadoEm = vinculadoEmMock.get(paciente.id);

    return HttpResponse.json({
      ...paraBackendListItemPaciente(paciente),
      vinculos:
        paciente.profissionalVinculadoId && vinculadoEm
          ? [
              {
                id: 1,
                profissional_id: paciente.profissionalVinculadoId,
                profissional_nome: nomeDoUsuario(paciente.profissionalVinculadoId) ?? "",
                data_vinculo: vinculadoEm,
                ativo: true,
                encerrado_em: null,
              },
            ]
          : [],
      diagnosticos: paginar(diagnosticos, pagina, limite),
    });
  }),
];
