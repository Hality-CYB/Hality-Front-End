import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import {
  diagnosticosMock as diagnosticos,
  idNumerico,
  maisRecentesPrimeiro,
  nomeDoUsuario,
  PACIENTE_MOCK_ID,
  pacientesMock,
  paginar,
  paraBackendListItem,
  temVinculo,
} from "@/services/mocks/mock-db";
import {
  diagnosticoNivelSchema,
  type BackendDiagnosticoDetail,
  type Diagnostico,
  type DiagnosticoNivel,
} from "@/types/diagnostico";
import type { Usuario } from "@/types/usuario";
import { nivelLabel } from "@/lib/level-format";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

/** Mesmo tempo do mock de IA do back (`MOCK_PROCESSING_SECONDS`). */
const TEMPO_PROCESSAMENTO_MS = 2000;
let proximoId = 900;
const criadosEm = new Map<string, number>();
const observacoesRevisao = new Map<string, string | null>();

const revisarDiagnosticoSchema = z.object({
  nivel: diagnosticoNivelSchema,
  observacoes: z.string().nullable().optional(),
});

/**
 * Sem modelo de IA de verdade, a "análise" é aleatória — só pra ter algo
 * pra mostrar na tela de resultado durante o desenvolvimento. Igual ao
 * back, o diagnóstico nasce "processando" e só vira "concluido" num GET
 * feito depois de TEMPO_PROCESSAMENTO_MS. "concluido" é o fim da análise da
 * IA; ter sido revisado é outra coisa (`revisao.revisado`).
 */
function analiseFalsa(): { nivel: DiagnosticoNivel; confiancaIA: number } {
  const niveis = [1, 2, 3] as const;
  const nivel = niveis[Math.floor(Math.random() * niveis.length)] ?? 1;
  const confiancaIA = 70 + Math.floor(Math.random() * 25);
  return { nivel, confiancaIA };
}

/** Espelha o que app/services/diagnostico_service.py monta em `conteudos`. */
const CONTEUDO_POR_NIVEL: Record<DiagnosticoNivel, { titulo: string; texto: string }> = {
  1: { titulo: "Higiene do dia a dia", texto: "Mantenha a rotina de higiene bucal e hidratação." },
  2: {
    titulo: "Cuidados recomendados",
    texto: "Reforce a limpeza lingual diária e considere uma avaliação periodontal.",
  },
  3: {
    titulo: "Encaminhamento sugerido",
    texto: "Procure um especialista para uma avaliação clínica detalhada.",
  },
};

function paraBackendDetail(d: Diagnostico): BackendDiagnosticoDetail {
  return {
    id: idNumerico(d.id),
    data_diagnostico: d.criadoEm,
    status: d.status,
    classificacao:
      d.nivel !== null
        ? {
            id: d.nivel,
            codigo: `nivel_${d.nivel}`,
            nome_exibicao: nivelLabel(d.nivel),
            ordem: d.nivel,
          }
        : null,
    escala_saburra: null,
    confianca_ia: d.confiancaIA === undefined ? null : d.confiancaIA / 100,
    imagens: d.imagemUrl ? [{ id: 1, url_arquivo: d.imagemUrl, ordem: 1 }] : [],
    anamnese: { id: idNumerico(d.anamneseId) },
    conteudos:
      d.nivel !== null
        ? [
            {
              id: d.nivel,
              titulo: CONTEUDO_POR_NIVEL[d.nivel].titulo,
              conteudo: { itens: [{ tipo: "texto", texto: CONTEUDO_POR_NIVEL[d.nivel].texto }] },
            },
          ]
        : [],
    revisao:
      d.nivel !== null
        ? {
            revisado: Boolean(d.revisadoPor),
            profissional_nome: nomeDoUsuario(d.revisadoPor),
            data_revisao: d.revisadoEm ?? null,
            observacoes: observacoesRevisao.get(d.id) ?? null,
          }
        : null,
    erro: null,
  };
}

function encontrar(id: string): number {
  return diagnosticos.findIndex((d) => d.id === id || idNumerico(d.id) === Number(id));
}

/** Regra de acesso do RBAC (PR #92): paciente vê os próprios, profissional os dos vinculados. */
function podeAcessar(usuario: Usuario, d: Diagnostico): boolean {
  if (usuario.role === "profissional")
    return !!d.pacienteId && temVinculo(d.pacienteId, usuario.id);
  if (usuario.role === "paciente") return d.pacienteId === PACIENTE_MOCK_ID;
  return false;
}

export const diagnosticosHandlers = [
  http.get(url("/api/v1/diagnosticos"), ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    const dataInicio = params.get("data_inicio");
    const dataFim = params.get("data_fim");
    const pagina = Number(params.get("pagina") ?? 1);
    const limite = Number(params.get("limite") ?? 20);
    const ordem = params.get("ordem") ?? "data_desc";
    const ehProfissional = usuario.role === "profissional";

    // TODO(backend): o back só lista os diagnósticos do próprio usuário.
    // Para o profissional, este mock lista os dos pacientes vinculados.
    let filtrados = diagnosticos.filter((d) => podeAcessar(usuario, d));
    if (status) filtrados = filtrados.filter((d) => d.status === status);
    if (dataInicio)
      filtrados = filtrados.filter((d) => new Date(d.criadoEm) >= new Date(dataInicio));
    if (dataFim) filtrados = filtrados.filter((d) => new Date(d.criadoEm) <= new Date(dataFim));
    filtrados = [...filtrados].sort(maisRecentesPrimeiro);
    if (ordem === "data_asc") filtrados.reverse();

    return HttpResponse.json(
      paginar(
        filtrados.map((d) => paraBackendListItem(d, ehProfissional)),
        pagina,
        limite,
      ),
    );
  }),

  http.get(url("/api/v1/diagnosticos/:id"), ({ params, request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    const index = encontrar(String(params.id));
    const diagnostico = diagnosticos[index];
    if (!diagnostico) return new HttpResponse(null, { status: 404 });
    // Exceção documentada no RBAC: existente sem acesso responde 403 nesta rota.
    if (!podeAcessar(usuario, diagnostico)) return new HttpResponse(null, { status: 403 });

    const criadoEm = criadosEm.get(diagnostico.id);
    if (
      diagnostico.status === "processando" &&
      criadoEm !== undefined &&
      Date.now() - criadoEm >= TEMPO_PROCESSAMENTO_MS
    ) {
      diagnosticos[index] = { ...diagnostico, ...analiseFalsa(), status: "concluido" };
    }
    return HttpResponse.json(paraBackendDetail(diagnosticos[index] ?? diagnostico));
  }),

  http.post(url("/api/v1/diagnosticos"), async ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    const form = await request.formData();
    const anamneseId = form.get("anamnese_id");
    const imagem = form.get("imagem");
    const parametros = form.get("parametros_captura");
    const pacienteIdForm = form.get("paciente_id");
    if (!anamneseId || !(imagem instanceof File) || typeof parametros !== "string") {
      return HttpResponse.json({ detail: "campos obrigatórios ausentes" }, { status: 422 });
    }

    // Atendimento pelo profissional (PR #91): o titular vem do form, validado pelo vínculo.
    let pacienteId = PACIENTE_MOCK_ID;
    if (typeof pacienteIdForm === "string" && pacienteIdForm) {
      if (usuario.role !== "profissional") {
        return HttpResponse.json(
          { detail: "apenas profissionais podem atender outro paciente" },
          { status: 403 },
        );
      }
      if (!pacientesMock.some((p) => p.id === pacienteIdForm)) {
        return HttpResponse.json({ detail: "paciente indisponível" }, { status: 404 });
      }
      if (!temVinculo(pacienteIdForm, usuario.id)) {
        return HttpResponse.json(
          { detail: "profissional sem vínculo com o paciente" },
          { status: 403 },
        );
      }
      pacienteId = pacienteIdForm;
    }

    const id = String(proximoId++);
    const diagnostico: Diagnostico = {
      id,
      pacienteId,
      profissionalId: usuario.role === "profissional" ? usuario.id : undefined,
      nivel: null,
      status: "processando",
      imagemUrl: "",
      anamneseId: String(anamneseId),
      modeloVersao: "mock-0.1.0",
      criadoEm: new Date().toISOString(),
    };
    diagnosticos.push(diagnostico);
    criadosEm.set(id, Date.now());
    return HttpResponse.json(
      {
        id: Number(id),
        status: diagnostico.status,
        data_diagnostico: diagnostico.criadoEm,
        anamnese_id: Number(anamneseId),
      },
      { status: 202 },
    );
  }),

  // TODO(backend): rota de revisão ainda não existe no back (contrato proposto).
  http.put(url("/api/v1/diagnosticos/:id/revisar"), async ({ params, request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    if (usuario.role !== "profissional") {
      return HttpResponse.json({ detail: "acesso restrito a profissionais" }, { status: 403 });
    }

    const index = encontrar(String(params.id));
    const atual = diagnosticos[index];
    if (!atual || !podeAcessar(usuario, atual)) return new HttpResponse(null, { status: 404 });

    const body = revisarDiagnosticoSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "nível inválido" }, { status: 422 });

    const atualizado: Diagnostico = {
      ...atual,
      nivel: body.data.nivel,
      status: "concluido",
      revisadoPor: usuario.id,
      revisadoEm: new Date().toISOString(),
    };
    diagnosticos[index] = atualizado;
    observacoesRevisao.set(atualizado.id, body.data.observacoes ?? null);
    return HttpResponse.json(paraBackendDetail(atualizado));
  }),
];
