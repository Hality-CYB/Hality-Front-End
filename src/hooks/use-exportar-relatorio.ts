"use client";

import { createElement, useState, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { urlDaApi } from "@/lib/url-da-api";
import { montarRelatorioDiagnostico, nomeArquivoRelatorio } from "@/lib/relatorio-diagnostico";
import type { Diagnostico, DiagnosticoNivel } from "@/types/diagnostico";

const LARGURA_MAXIMA_FOTO = 1200;

/**
 * Converte a foto para JPEG embutido. O PDF só aceita JPEG e PNG, e a foto do
 * diagnóstico pode vir em WebP ou HEIC convertido; passar pelo canvas resolve e
 * ainda reduz fotos grandes.
 */
async function fotoComoDataUrl(url: string): Promise<string> {
  // Sem cache: a tela já carregou a foto num <img>, sem CORS, e o navegador
  // reaproveitaria essa cópia, que não serve para um fetch com CORS.
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`foto ${resposta.status}`);
  const bitmap = await createImageBitmap(await resposta.blob());
  const escala = Math.min(1, LARGURA_MAXIMA_FOTO / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  // Dá tempo para o navegador começar o download antes de liberar a URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

type Opcoes = {
  pacienteNome?: string | null;
  nivelIA?: DiagnosticoNivel | null;
};

/**
 * Gera o relatório do diagnóstico em PDF no próprio navegador e baixa o arquivo.
 * A biblioteca de PDF só é carregada no clique, para não pesar no app.
 */
export function useExportarRelatorio(diagnostico: Diagnostico | undefined, opcoes: Opcoes = {}) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function exportar() {
    if (!diagnostico || gerando) return;
    setGerando(true);
    setErro(null);
    try {
      const [{ pdf }, { RelatorioDiagnosticoPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/relatorio-diagnostico-pdf"),
      ]);
      // Sem a foto o relatório ainda serve: ele sai sem a imagem em vez de falhar.
      const foto = diagnostico.imagemUrl
        ? await fotoComoDataUrl(urlDaApi(diagnostico.imagemUrl)).catch(() => null)
        : null;
      const relatorio = montarRelatorioDiagnostico(diagnostico, opcoes);
      const documento = createElement(RelatorioDiagnosticoPdf, {
        relatorio,
        foto,
      }) as unknown as ReactElement<DocumentProps>;
      baixar(await pdf(documento).toBlob(), nomeArquivoRelatorio(diagnostico));
    } catch {
      setErro("Não foi possível gerar o PDF. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  return { exportar, gerando, erro };
}
