import { z } from "zod";
import type { BadgeStatus } from "@/lib/level-format";

export const backendClassificacaoHomeSchema = z.object({
  codigo: z.string(),
  nome_exibicao: z.string(),
});

export const backendUltimoDiagnosticoHomeSchema = z.object({
  id: z.number(),
  data_diagnostico: z.iso.datetime(),
  status: z.string(),
  classificacao: backendClassificacaoHomeSchema.nullable(),
  escala_saburra: z.number().nullable(),
});

export const backendDicaHomeSchema = z.object({
  id: z.number(),
  titulo: z.string(),
  conteudo: z.string(),
});

export const backendHomeSchema = z.object({
  usuario: z.object({
    id: z.string(),
    nome: z.string(),
    tipo_usuario: z.string(),
  }),
  total_diagnosticos: z.number(),
  avisos_nao_lidos: z.number(),
  ultimo_diagnostico: backendUltimoDiagnosticoHomeSchema.nullable(),
  total_dicas: z.number(),
  dicas: z.array(backendDicaHomeSchema),
});
export type BackendHome = z.infer<typeof backendHomeSchema>;

export type UltimoDiagnosticoHome = {
  id: number;
  dataDiagnostico: string;
  status: string;
  classificacaoCodigo: string | null;
  classificacaoLabel: string | null;
  escalaSaburra: number | null;
};

export type DicaHome = {
  id: number;
  titulo: string;
  conteudo: string;
};

export type HomeData = {
  usuarioNome: string;
  totalDiagnosticos: number;
  avisosNaoLidos: number;
  ultimoDiagnostico: UltimoDiagnosticoHome | null;
  totalDicas: number;
  dicas: DicaHome[];
};

export function adaptBackendHome(data: BackendHome): HomeData {
  const ultimo = data.ultimo_diagnostico;
  return {
    usuarioNome: data.usuario.nome,
    totalDiagnosticos: data.total_diagnosticos,
    avisosNaoLidos: data.avisos_nao_lidos,
    ultimoDiagnostico: ultimo
      ? {
          id: ultimo.id,
          dataDiagnostico: ultimo.data_diagnostico,
          status: ultimo.status,
          classificacaoCodigo: ultimo.classificacao?.codigo ?? null,
          classificacaoLabel: ultimo.classificacao?.nome_exibicao ?? null,
          escalaSaburra: ultimo.escala_saburra,
        }
      : null,
    totalDicas: data.total_dicas,
    dicas: data.dicas,
  };
}

export const ESCALA_SABURRA_MAX = 100;

export function classificacaoStatus(codigo: string): BadgeStatus {
  if (codigo === "saudavel" || codigo === "halitose_leve") return "success";
  if (codigo === "halitose_social") return "warning";
  if (codigo === "halitose_severa") return "danger";
  return "neutral";
}
