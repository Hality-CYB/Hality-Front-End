import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useExportarRelatorio } from "@/hooks/use-exportar-relatorio";
import type { Diagnostico } from "@/types/diagnostico";

const toBlob = vi.fn();
vi.mock("@react-pdf/renderer", () => ({ pdf: () => ({ toBlob }) }));
vi.mock("@/components/relatorio-diagnostico-pdf", () => ({
  RelatorioDiagnosticoPdf: () => null,
}));

const diagnostico = {
  id: "42",
  nivel: 1,
  status: "concluido",
  imagemUrl: "/api/v1/diagnosticos/imagens/a.jpg",
  anamneseId: "7",
  criadoEm: "2026-11-10T15:00:00Z",
  revisao: null,
} as Diagnostico;

describe("useExportarRelatorio", () => {
  let clique: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    toBlob.mockReset();
    clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:relatorio");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    // A foto falha (o jsdom não decodifica imagem): o relatório sai sem ela.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sem rede")));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("gera o PDF e baixa com o nome sem dado pessoal, mesmo sem conseguir a foto", async () => {
    toBlob.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    const { result } = renderHook(() => useExportarRelatorio(diagnostico));

    await act(() => result.current.exportar());

    expect(toBlob).toHaveBeenCalledOnce();
    expect(clique).toHaveBeenCalledOnce();
    const link = clique.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("check-your-breath-diagnostico-42-20261110.pdf");
    expect(result.current.erro).toBeNull();
    expect(result.current.gerando).toBe(false);
  });

  it("se a geração falha, avisa e deixa tentar de novo", async () => {
    toBlob.mockRejectedValue(new Error("quebrou"));
    const { result } = renderHook(() => useExportarRelatorio(diagnostico));

    await act(() => result.current.exportar());

    expect(result.current.erro).toBe("Não foi possível gerar o PDF. Tente de novo.");
    expect(clique).not.toHaveBeenCalled();
  });
});
