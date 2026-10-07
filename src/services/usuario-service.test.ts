import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";
import { SENHA_MOCK } from "@/services/mocks/auth-handlers";
import { seedUsuarios } from "@/services/mocks/seed-data";
import { usuarioService } from "@/services/usuario-service";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

describe("usuarioService.alterarSenha", () => {
  afterEach(() => clearStoredToken());

  it("manda senha_atual e nova_senha pro PATCH /users/me/senha", async () => {
    let corpo: unknown;
    server.use(
      http.patch(url("/api/v1/users/me/senha"), async ({ request }) => {
        corpo = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await usuarioService.alterarSenha({ senhaAtual: "antiga123", novaSenha: "novaSenha1" });

    expect(corpo).toEqual({ senha_atual: "antiga123", nova_senha: "novaSenha1" });
  });

  it("propaga o 400 do back quando a senha atual não confere", async () => {
    server.use(
      http.patch(url("/api/v1/users/me/senha"), () =>
        HttpResponse.json({ detail: "senha atual inválida" }, { status: 400 }),
      ),
    );

    const erro = await usuarioService
      .alterarSenha({ senhaAtual: "errada", novaSenha: "novaSenha1" })
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(400);
  });

  it("no mock, a senha nova passa a ser a atual", async () => {
    setStoredToken(`mock-token:${seedUsuarios[0]!.id}`);

    await usuarioService.alterarSenha({ senhaAtual: SENHA_MOCK, novaSenha: "outraSenha1" });

    await expect(
      usuarioService.alterarSenha({ senhaAtual: SENHA_MOCK, novaSenha: "maisUma123" }),
    ).rejects.toMatchObject({ status: 400 });
    await usuarioService.alterarSenha({ senhaAtual: "outraSenha1", novaSenha: "maisUma123" });
  });
});
