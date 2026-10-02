import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import { respostasDaAnamnese, titularDaAnamnese } from "@/services/mocks/anamnese-handlers";
import {
  diagnosticosMock as diagnosticos,
  classificacaoResumo,
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
  CODIGO_POR_NIVEL,
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

/** Histórico append-only de revisões por diagnóstico, igual à tabela `diagnostico_revisoes` (#100). */
type RevisaoMock = {
  id: number;
  versao: number;
  nivel: DiagnosticoNivel;
  profissionalId: string;
  observacao: string | null;
  criadoEm: string;
};
let proximaRevisaoId = 1;
const revisoes = new Map<string, RevisaoMock[]>();
for (const d of diagnosticos) {
  if (d.revisadoPor && d.nivel !== null) {
    revisoes.set(d.id, [
      {
        id: proximaRevisaoId++,
        versao: 1,
        nivel: d.nivel,
        profissionalId: d.revisadoPor,
        observacao: null,
        criadoEm: d.revisadoEm ?? d.criadoEm,
      },
    ]);
  }
}

const revisarSchema = z.object({
  classificacao: z.string().min(1).max(50),
  observacao: z.string().max(2000).nullable().optional(),
  version: z.number().int().min(0),
});

const STATUS_COM_RESULTADO = new Set(["aguardando_revisao", "concluido"]);

function nivelDoCodigo(codigo: string): DiagnosticoNivel | null {
  const niveis = [1, 2, 3] as const;
  return niveis.find((n) => CODIGO_POR_NIVEL[n] === codigo.trim()) ?? null;
}

function montarRevisaoPaciente(d: Diagnostico): BackendDiagnosticoDetail["revisao"] {
  if (!STATUS_COM_RESULTADO.has(d.status)) return null;
  const ultima = revisoes.get(d.id)?.at(-1);
  // Igual a `_montar_revisao` do back (#102): havendo revisão, conta como revisado.
  if (!ultima) {
    return {
      profissional_nome: null,
      data_revisao: null,
      observacoes: null,
      classificacao: null,
      nivel_corrigido: false,
    };
  }
  return {
    profissional_nome: nomeDoUsuario(ultima.profissionalId),
    data_revisao: ultima.criadoEm,
    observacoes: ultima.observacao,
    classificacao: classificacaoResumo(ultima.nivel),
    nivel_corrigido: d.nivel !== ultima.nivel,
  };
}

/**
 * Sem modelo de IA de verdade, a "análise" é aleatória — só pra ter algo
 * pra mostrar na tela de resultado durante o desenvolvimento. Igual ao
 * back, o diagnóstico nasce "processando" e só sai disso num GET feito
 * depois de TEMPO_PROCESSAMENTO_MS: a IA deixa em "aguardando_revisao", e
 * só a revisão do profissional leva a "concluido".
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

/** Nível que vale: o da revisão mais recente, senão o da IA. */
function nivelVigente(d: Diagnostico): DiagnosticoNivel | null {
  return revisoes.get(d.id)?.at(-1)?.nivel ?? d.nivel;
}

function paraBackendDetail(d: Diagnostico): BackendDiagnosticoDetail {
  const nivel = nivelVigente(d);
  return {
    id: idNumerico(d.id),
    data_diagnostico: d.criadoEm,
    status: d.status,
    classificacao:
      nivel !== null
        ? {
            id: nivel,
            codigo: CODIGO_POR_NIVEL[nivel],
            nome_exibicao: nivelLabel(nivel),
            ordem: nivel,
          }
        : null,
    escala_saburra: null,
    confianca_ia: d.confiancaIA === undefined ? null : d.confiancaIA / 100,
    imagens: d.imagemUrl ? [{ id: 1, url_arquivo: d.imagemUrl, ordem: 1 }] : [],
    anamnese: {
      id: idNumerico(d.anamneseId),
      respostas: respostasDaAnamnese(String(idNumerico(d.anamneseId))),
    },
    conteudos:
      nivel !== null
        ? [
            {
              id: nivel,
              titulo: CONTEUDO_POR_NIVEL[nivel].titulo,
              conteudo: { itens: [{ tipo: "texto", texto: CONTEUDO_POR_NIVEL[nivel].texto }] },
            },
          ]
        : [],
    revisao: montarRevisaoPaciente(d),
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

function paraBackendRevisao(r: RevisaoMock) {
  return {
    id: r.id,
    version: r.versao,
    classificacao: classificacaoResumo(r.nivel),
    profissional_id: r.profissionalId,
    profissional_nome: nomeDoUsuario(r.profissionalId),
    observacao: r.observacao,
    criado_em: r.criadoEm,
  };
}

function pacienteResumo(d: Diagnostico) {
  const paciente = pacientesMock.find((p) => p.id === d.pacienteId);
  return { id: d.pacienteId ?? "", nome: paciente?.nome ?? "Paciente" };
}

/** Rotas de `/profissional/...` exigem papel de profissional (403 para os outros). */
function profissionalDoRequest(request: Request) {
  const usuario = usuarioDoRequest(request);
  if (!usuario) return { erro: new HttpResponse(null, { status: 401 }) };
  if (usuario.role !== "profissional") {
    return {
      erro: HttpResponse.json({ detail: "acesso restrito a profissionais" }, { status: 403 }),
    };
  }
  return { usuario };
}

export const diagnosticosHandlers = [
  // Só o paciente lista os próprios diagnósticos; o profissional usa /profissional/diagnosticos.
  http.get(url("/api/v1/diagnosticos"), ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    if (usuario.role !== "paciente") return new HttpResponse(null, { status: 403 });

    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    const dataInicio = params.get("data_inicio");
    const dataFim = params.get("data_fim");
    const pagina = Number(params.get("pagina") ?? 1);
    const limite = Number(params.get("limite") ?? 20);
    const ordem = params.get("ordem") ?? "data_desc";

    let filtrados = diagnosticos.filter((d) => podeAcessar(usuario, d));
    if (status) filtrados = filtrados.filter((d) => d.status === status);
    if (dataInicio)
      filtrados = filtrados.filter((d) => new Date(d.criadoEm) >= new Date(dataInicio));
    if (dataFim) filtrados = filtrados.filter((d) => new Date(d.criadoEm) <= new Date(dataFim));
    filtrados = [...filtrados].sort(maisRecentesPrimeiro);
    if (ordem === "data_asc") filtrados.reverse();

    const itens = filtrados.map((d) => ({
      ...paraBackendListItem(d),
      classificacao: classificacaoResumo(nivelVigente(d)),
    }));
    return HttpResponse.json(paginar(itens, pagina, limite));
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
      diagnosticos[index] = { ...diagnostico, ...analiseFalsa(), status: "aguardando_revisao" };
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
    if (!anamneseId || !(imagem instanceof File) || typeof parametros !== "string") {
      return HttpResponse.json({ detail: "campos obrigatórios ausentes" }, { status: 422 });
    }

    // Igual ao back (#91): o titular vem da anamnese, e quem envia precisa ter acesso a ele.
    const pacienteId = titularDaAnamnese(String(anamneseId));
    const podeUsar =
      pacienteId !== undefined &&
      (usuario.role === "profissional"
        ? temVinculo(pacienteId, usuario.id)
        : usuario.role === "paciente" && pacienteId === PACIENTE_MOCK_ID);
    if (!pacienteId || !podeUsar) {
      return HttpResponse.json({ detail: "anamnese não encontrada" }, { status: 404 });
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

  http.get(url("/api/v1/profissional/diagnosticos"), ({ request }) => {
    const { usuario, erro } = profissionalDoRequest(request);
    if (!usuario) return erro;

    const params = new URL(request.url).searchParams;
    const pacienteId = params.get("paciente_id");
    const status = params.get("status");
    const dataInicio = params.get("data_inicio");
    const dataFim = params.get("data_fim");
    const pagina = Number(params.get("pagina") ?? 1);
    const limite = Number(params.get("limite") ?? 20);
    const ordem = params.get("ordem") ?? "data_desc";

    let filtrados = diagnosticos.filter((d) => podeAcessar(usuario, d));
    if (pacienteId) filtrados = filtrados.filter((d) => d.pacienteId === pacienteId);
    if (status) filtrados = filtrados.filter((d) => d.status === status);
    if (dataInicio)
      filtrados = filtrados.filter((d) => new Date(d.criadoEm) >= new Date(dataInicio));
    if (dataFim) filtrados = filtrados.filter((d) => new Date(d.criadoEm) <= new Date(dataFim));
    filtrados = [...filtrados].sort(maisRecentesPrimeiro);
    if (ordem === "data_asc") filtrados.reverse();

    const itens = filtrados.map((d) => ({
      id: idNumerico(d.id),
      paciente: pacienteResumo(d),
      data_diagnostico: d.criadoEm,
      status: d.status,
      classificacao_automatica: classificacaoResumo(d.nivel),
      tem_revisao: (revisoes.get(d.id)?.length ?? 0) > 0,
      revisao: (() => {
        const ultima = revisoes.get(d.id)?.at(-1);
        return ultima
          ? {
              classificacao: classificacaoResumo(ultima.nivel),
              nivel_corrigido: d.nivel !== ultima.nivel,
            }
          : null;
      })(),
    }));
    return HttpResponse.json(paginar(itens, pagina, limite));
  }),

  http.get(url("/api/v1/profissional/diagnosticos/:id"), ({ params, request }) => {
    const { usuario, erro } = profissionalDoRequest(request);
    if (!usuario) return erro;

    const diagnostico = diagnosticos[encontrar(String(params.id))];
    // Sem vínculo ativo responde igual a inexistente.
    if (!diagnostico || !podeAcessar(usuario, diagnostico)) {
      return HttpResponse.json({ detail: "diagnóstico não encontrado" }, { status: 404 });
    }

    const historico = revisoes.get(diagnostico.id) ?? [];
    const atual = historico.at(-1);
    return HttpResponse.json({
      id: idNumerico(diagnostico.id),
      data_diagnostico: diagnostico.criadoEm,
      status: diagnostico.status,
      paciente: pacienteResumo(diagnostico),
      automatico: STATUS_COM_RESULTADO.has(diagnostico.status)
        ? {
            classificacao: classificacaoResumo(diagnostico.nivel),
            confianca_ia:
              diagnostico.confiancaIA === undefined ? null : diagnostico.confiancaIA / 100,
          }
        : null,
      revisao: atual ? paraBackendRevisao(atual) : null,
      historico_revisoes: historico.map(paraBackendRevisao),
      version: atual?.versao ?? 0,
    });
  }),

  // Revisão append-only (#100): não muda status nem a classificação automática.
  http.patch(url("/api/v1/profissional/diagnosticos/:id/revisao"), async ({ params, request }) => {
    const { usuario, erro } = profissionalDoRequest(request);
    if (!usuario) return erro;

    const index = encontrar(String(params.id));
    const atual = diagnosticos[index];
    if (!atual || !podeAcessar(usuario, atual)) {
      return HttpResponse.json({ detail: "diagnóstico não encontrado" }, { status: 404 });
    }

    const body = revisarSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "payload inválido" }, { status: 422 });
    if (!STATUS_COM_RESULTADO.has(atual.status)) {
      return HttpResponse.json(
        { detail: "diagnóstico não está disponível para revisão" },
        { status: 409 },
      );
    }
    const nivel = nivelDoCodigo(body.data.classificacao);
    if (!nivel) return HttpResponse.json({ detail: "classificação inválida" }, { status: 400 });

    const historico = revisoes.get(atual.id) ?? [];
    const versaoAtual = historico.at(-1)?.versao ?? 0;
    if (body.data.version !== versaoAtual) {
      return HttpResponse.json(
        { detail: "a revisão foi alterada por outra pessoa; recarregue e tente novamente" },
        { status: 409 },
      );
    }

    const nova: RevisaoMock = {
      id: proximaRevisaoId++,
      versao: versaoAtual + 1,
      nivel,
      profissionalId: usuario.id,
      observacao: body.data.observacao ?? null,
      criadoEm: new Date().toISOString(),
    };
    revisoes.set(atual.id, [...historico, nova]);
    diagnosticos[index] = {
      ...atual,
      status: "concluido",
      revisadoPor: usuario.id,
      revisadoEm: nova.criadoEm,
    };
    return HttpResponse.json({ revisao: paraBackendRevisao(nova), version: nova.versao });
  }),
];
