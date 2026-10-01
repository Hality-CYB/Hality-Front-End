import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import {
  diagnosticosMock,
  maisRecentesPrimeiro,
  pacientesDoProfissional,
} from "@/services/mocks/mock-db";
import { seedProfissionais } from "@/services/mocks/seed-data";

const profissionais = [...seedProfissionais];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

/** Mesmo padrão do back quando não vem `inicio` (PR #89, ainda em aberto no DEC-05). */
const PERIODO_PADRAO_DIAS = 30;

export const profissionaisHandlers = [
  http.get(url("/api/v1/profissionais"), () => HttpResponse.json(profissionais)),

  http.get(url("/api/v1/profissionais/:id"), ({ params }) => {
    const profissional = profissionais.find((p) => p.id === params.id);
    if (!profissional) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(profissional);
  }),

  http.get(url("/api/v1/profissional/resumo"), ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    if (usuario.role !== "profissional") {
      return HttpResponse.json({ detail: "acesso restrito a profissionais" }, { status: 403 });
    }

    const params = new URL(request.url).searchParams;
    const fim = params.get("fim") ? new Date(params.get("fim")!) : new Date();
    const inicio = params.get("inicio")
      ? new Date(params.get("inicio")!)
      : new Date(fim.getTime() - PERIODO_PADRAO_DIAS * 24 * 60 * 60 * 1000);

    const pacientes = pacientesDoProfissional(usuario.id);
    const ids = new Set(pacientes.map((p) => p.id));
    const doProfissional = diagnosticosMock.filter((d) => d.pacienteId && ids.has(d.pacienteId));
    const noPeriodo = doProfissional.filter((d) => {
      const data = new Date(d.criadoEm);
      return data >= inicio && data <= fim;
    });

    return HttpResponse.json({
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString(), timezone: "UTC" },
      pacientes_ativos: pacientes.length,
      diagnosticos_total: noPeriodo.length,
      pendentes_revisao: noPeriodo.filter((d) => d.status === "aguardando_revisao").length,
      ultimo_diagnostico_em: [...doProfissional].sort(maisRecentesPrimeiro)[0]?.criadoEm ?? null,
    });
  }),
];
