import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyDialog } from "@/components/privacy-dialog";
import type { EstadoConsentimento } from "@/types/consentimento";

const estados: EstadoConsentimento[] = [
  {
    finalidade: "health_data",
    obrigatorio: true,
    versaoVigente: "v1",
    aceito: true,
    vigente: true,
    requerDecisao: false,
    decididoEm: "2026-10-01T12:00:00Z",
  },
  {
    finalidade: "image_training",
    obrigatorio: false,
    versaoVigente: "v1",
    aceito: false,
    vigente: false,
    requerDecisao: false,
    decididoEm: "2026-10-01T12:00:00Z",
  },
];

function renderDialog(onDecidir = vi.fn()) {
  render(
    <PrivacyDialog
      open
      onOpenChange={vi.fn()}
      termos={[
        {
          finalidade: "health_data",
          versao: "v1",
          obrigatorio: true,
          titulo: "Dados de saúde",
          texto: "t",
        },
        {
          finalidade: "image_training",
          versao: "v1",
          obrigatorio: false,
          titulo: "Treino da IA",
          texto: "t",
        },
      ]}
      estados={estados}
      carregando={false}
      erroCarregar={false}
      onTentarDeNovo={vi.fn()}
      onDecidir={onDecidir}
      salvando={false}
      erroDecisao={null}
    />,
  );
  return onDecidir;
}

describe("PrivacyDialog", () => {
  it("mostra o estado vindo do back em cada consentimento", () => {
    renderDialog();
    expect(screen.getByRole("switch", { name: "Dados de saúde" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: "Treino da IA" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("aceitar o opcional manda a decisão na versão vigente, sem confirmação", async () => {
    const onDecidir = renderDialog();
    await userEvent.click(screen.getByRole("switch", { name: "Treino da IA" }));
    expect(onDecidir).toHaveBeenCalledWith({
      finalidade: "image_training",
      versao: "v1",
      aceito: true,
    });
  });

  it("revogar dados de saúde pede confirmação antes de mandar", async () => {
    const onDecidir = renderDialog();
    await userEvent.click(screen.getByRole("switch", { name: "Dados de saúde" }));
    expect(onDecidir).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Revogar" }));
    expect(onDecidir).toHaveBeenCalledWith({
      finalidade: "health_data",
      versao: "v1",
      aceito: false,
    });
  });

  it("ações que não existem no back aparecem como em breve, sem botão", () => {
    renderDialog();
    expect(screen.getAllByText("Em breve")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /Excluir minha conta/ })).not.toBeInTheDocument();
  });
});
