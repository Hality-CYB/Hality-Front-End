import { formatarResposta } from "@/lib/anamnese-format";
import { formatarData } from "@/lib/datas";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import { textosDoConteudo } from "@/types/conteudo";
import type { Diagnostico, DiagnosticoNivel } from "@/types/diagnostico";

export const AVISO_PRE_DIAGNOSTICO =
  "Pré-diagnóstico de apoio gerado com inteligência artificial. Não substitui a avaliação de um profissional de saúde.";

/** O conteúdo do relatório já resolvido, sem nada de layout: é o que o PDF desenha. */
export type RelatorioDiagnostico = {
  numero: string;
  data: string;
  pacienteNome: string | null;
  resultado: {
    titulo: string;
    nivel: string;
    cor: string;
    /** Linha secundária: o nível da IA quando a revisão mudou o resultado. */
    detalhe: string | null;
  };
  revisao: { autor: string; data: string | null; observacoes: string | null } | null;
  /** Diagnóstico ainda sem revisão: o leitor precisa saber disso logo no topo. */
  aguardandoRevisao: boolean;
  anamnese: { pergunta: string; resposta: string }[];
  orientacoes: { titulo: string; textos: string[] }[];
  geradoEm: string;
};

type Opcoes = {
  pacienteNome?: string | null;
  /** Nível original da IA, que só a visão do profissional recebe. */
  nivelIA?: DiagnosticoNivel | null;
  agora?: Date;
};

/** Monta o relatório com a mesma regra da tela: o nível revisado prevalece sobre o da IA. */
export function montarRelatorioDiagnostico(
  diagnostico: Diagnostico,
  { pacienteNome = null, nivelIA, agora = new Date() }: Opcoes = {},
): RelatorioDiagnostico {
  const revisao = diagnostico.revisao?.revisado ? diagnostico.revisao : null;
  const nivelFinal: DiagnosticoNivel | null =
    (revisao?.nivelCorrigido ? revisao.nivel : null) ?? diagnostico.nivel;
  const nivelOriginal = nivelIA !== undefined ? nivelIA : null;

  let detalhe: string | null = null;
  if (revisao?.nivelCorrigido) {
    detalhe =
      nivelOriginal !== null
        ? `Ajustado na revisão. A IA indicou ${nivelLabel(nivelOriginal)}.`
        : "Ajustado na revisão.";
  } else if (!revisao && diagnostico.confiancaIA !== undefined) {
    detalhe = `Escala de halitose: ${diagnostico.confiancaIA}%`;
  }

  return {
    numero: diagnostico.id,
    data: formatarData(diagnostico.criadoEm),
    pacienteNome,
    resultado: {
      titulo: revisao ? "Resultado revisado" : "Resultado da IA",
      nivel: nivelFinal !== null ? nivelLabel(nivelFinal) : "Sem classificação",
      cor: nivelColor(nivelFinal),
      detalhe,
    },
    revisao: revisao
      ? {
          autor: revisao.profissionalNome ?? "profissional Hality",
          data: revisao.revisadoEm ? formatarData(revisao.revisadoEm) : null,
          observacoes: revisao.observacoes?.trim() || null,
        }
      : null,
    aguardandoRevisao: !revisao,
    anamnese: (diagnostico.respostasAnamnese ?? []).map((r) => ({
      pergunta: r.enunciado,
      resposta: formatarResposta(r.tipo, r.valor),
    })),
    orientacoes: (diagnostico.conteudos ?? [])
      .map((c) => ({
        titulo: c.titulo,
        // Imagem e vídeo não cabem no papel; os outros blocos (texto, protocolo…)
        // usam o mesmo texto que a tela mostra.
        textos: textosDoConteudo({
          itens: c.blocos.filter((b) => b.tipo !== "imagem" && b.tipo !== "video"),
        })
          .map((t) => t.trim())
          .filter(Boolean),
      }))
      .filter((c) => c.textos.length > 0),
    geradoEm: formatarData(agora.toISOString()),
  };
}

/** Nome do arquivo sem dado pessoal: só o número e a data do diagnóstico. */
export function nomeArquivoRelatorio(diagnostico: Pick<Diagnostico, "id" | "criadoEm">): string {
  const data = diagnostico.criadoEm.slice(0, 10).replaceAll("-", "");
  return `check-your-breath-diagnostico-${diagnostico.id}-${data}.pdf`;
}
