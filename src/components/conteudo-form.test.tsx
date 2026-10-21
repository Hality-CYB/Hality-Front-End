import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConteudoForm } from "@/components/conteudo-form";
import type { ConteudoAdmin } from "@/types/conteudo-admin";
import type { Classificacao } from "@/types/classificacao";

const classificacoes: Classificacao[] = [
  { id: 11, codigo: "halito_normal", nome: "Hálito Normal", nivel: 1 },
  { id: 12, codigo: "halitose_intima", nome: "Halitose Íntima", nivel: 2 },
  { id: 13, codigo: "mau_halito_social", nome: "Mau Hálito Social", nivel: 3 },
];

const existente: ConteudoAdmin = {
  id: "1",
  titulo: "Protocolo",
  categoria: "tratamento",
  blocos: [{ tipo: "protocolo_tratamento", descricao: "Mensal" }],
  classificacaoIds: [13],
  destinos: ["orientacoes_diagnostico"],
  publicado: true,
  ordem: 2,
  criadoEm: "2026-10-01T00:00:00Z",
  atualizadoEm: "2026-10-01T00:00:00Z",
};

/** Cola o texto de uma vez: digitar letra a letra estoura o timeout com a suíte cheia. */
async function preencher(campo: HTMLElement, texto: string) {
  await userEvent.click(campo);
  await userEvent.paste(texto);
}

function renderForm(
  conteudo?: ConteudoAdmin,
  onEnviarMidia = vi.fn(async () => "/api/v1/public/conteudos/midias/abc.png"),
) {
  const onSalvar = vi.fn();
  render(
    <ConteudoForm
      conteudo={conteudo}
      classificacoes={classificacoes}
      onEnviarMidia={onEnviarMidia}
      onSalvar={onSalvar}
    />,
  );
  return onSalvar;
}

const foto = () => new File(["png"], "foto.png", { type: "image/png" });

describe("ConteudoForm", () => {
  it("envia a imagem, mostra a prévia e publica com a URL devolvida", async () => {
    const onSalvar = renderForm();
    await preencher(screen.getByLabelText("Título"), "Língua limpa");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "higiene");
    await userEvent.click(screen.getByRole("button", { name: "Imagem" }));
    await userEvent.upload(screen.getByLabelText(/Escolher imagem/), foto());
    expect(await screen.findByAltText("Prévia da imagem enviada")).toHaveAttribute(
      "src",
      expect.stringContaining("/api/v1/public/conteudos/midias/abc.png"),
    );
    await preencher(screen.getByLabelText("Descrição"), "Limpador de língua");
    await userEvent.click(screen.getByLabelText("Orientações do diagnóstico"));
    await userEvent.click(screen.getByRole("checkbox", { name: "Mau Hálito Social" }));

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect(onSalvar).toHaveBeenCalledWith({
      titulo: "Língua limpa",
      categoria: "higiene",
      blocos: [
        {
          tipo: "imagem",
          url: "/api/v1/public/conteudos/midias/abc.png",
          legenda: "Limpador de língua",
        },
      ],
      destinos: ["orientacoes_diagnostico"],
      classificacaoIds: [13],
      publicado: true,
      ordem: 0,
    });
  });

  it("só oferece home e orientações como destino, e sem rascunho", () => {
    renderForm();
    expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("id"))).toEqual([
      "destino-home_autenticada",
      "destino-orientacoes_diagnostico",
    ]);
    expect(screen.queryByRole("button", { name: /rascunho/i })).not.toBeInTheDocument();
  });

  it("mostra o que impede salvar e não envia", async () => {
    const onSalvar = renderForm();
    await userEvent.click(screen.getByLabelText("Orientações do diagnóstico"));
    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Dê um título ao conteúdo.");
    expect(alerta).toHaveTextContent("Escolha a categoria.");
    expect(alerta).toHaveTextContent("Escreva o texto.");
    expect(alerta).toHaveTextContent("Escolha pelo menos um nível");
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("edição de formato que o editor não monta mantém o corpo; sem orientações, os níveis não vão", async () => {
    const onSalvar = renderForm(existente);
    expect(screen.getByText(/vai ser mantido como está: Mensal/)).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Orientações do diagnóstico"));
    await userEvent.click(screen.getByLabelText("Home do paciente"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        blocos: [{ tipo: "protocolo_tratamento", descricao: "Mensal" }],
        destinos: ["home_autenticada"],
        classificacaoIds: [],
        publicado: true,
      }),
    );
  });

  it("recusa arquivo de formato errado antes de enviar e mostra o erro do envio", async () => {
    const onEnviarMidia = vi.fn(async () => {
      throw new Error("Arquivo grande demais. Envie um arquivo menor.");
    });
    renderForm(undefined, onEnviarMidia);
    await userEvent.click(screen.getByRole("button", { name: "Vídeo" }));

    await userEvent.upload(
      screen.getByLabelText(/Escolher vídeo/),
      new File(["x"], "doc.pdf", { type: "application/pdf" }),
      { applyAccept: false },
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Formato não aceito");
    expect(onEnviarMidia).not.toHaveBeenCalled();

    await userEvent.upload(
      screen.getByLabelText(/Escolher vídeo/),
      new File(["x"], "v.mp4", { type: "video/mp4" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Arquivo grande demais");
  });
});
