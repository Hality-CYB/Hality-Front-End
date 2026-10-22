import { describe, expect, it } from "vitest";
import {
  lerRetornoGoogle,
  mensagemDoErroCallbackGoogle,
  removerParametrosDoRetornoGoogle,
} from "@/lib/retorno-google";

const codigo = "codigo-temporario-de-uso-unico";
const url = (query = "") => new URL(`/login/google${query}`, "https://cyb.test");

describe("retorno do Google", () => {
  it.each(["sessao", "consentimento"] as const)("aceita a etapa %s", (etapa) => {
    expect(lerRetornoGoogle(url(`?code=${codigo}&etapa=${etapa}`))).toEqual({
      status: etapa,
      codigo,
      etapa,
    });
  });

  it("aceita somente os erros públicos conhecidos", () => {
    expect(lerRetornoGoogle(url("?erro=cancelado"))).toEqual({
      status: "erro",
      erro: "cancelado",
    });
    expect(mensagemDoErroCallbackGoogle("cancelado")).toContain("cancelou");
    expect(lerRetornoGoogle(url("?erro=erro_desconhecido"))).toEqual({ status: "invalido" });
  });

  it.each([
    ["estado_invalido", "validar este login"],
    ["callback_invalido", "retorno do Google"],
    ["erro_provedor", "não conseguiu concluir"],
    ["provedor_indisponivel", "indisponível"],
    ["identidade_invalida", "confirmar sua identidade"],
    ["email_nao_verificado", "e-mail foi verificado"],
    ["conta_existente", "e-mail e senha"],
    ["papel_nao_permitido", "apenas para pacientes"],
    ["conta_inativa", "conta está inativa"],
  ] as const)("traduz o callback %s sem mostrar códigos técnicos", (erro, trecho) => {
    expect(mensagemDoErroCallbackGoogle(erro)).toContain(trecho);
  });

  it.each([
    "",
    `?code=${codigo}`,
    "?etapa=sessao",
    `?code=${codigo}&etapa=outra`,
    `?code=${codigo}&code=outro&etapa=sessao`,
    `?code=${codigo}&etapa=sessao&erro=cancelado`,
  ])("não adivinha retornos ausentes, incompletos ou ambíguos: %s", (query) => {
    expect(lerRetornoGoogle(url(query)).status).toBe(query ? "invalido" : "ausente");
  });

  it("remove somente os parâmetros do Google e preserva o restante da URL", () => {
    const retorno = url(`?utm_source=google&code=${codigo}&etapa=sessao#resultado`);
    expect(removerParametrosDoRetornoGoogle(retorno)).toBe(
      "/login/google?utm_source=google#resultado",
    );
  });
});
