import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { pacienteService } from "@/services/paciente-service";
import { server } from "@/services/mocks/server";

beforeEach(() => setStoredToken("mock-token:profissional-1"));
afterEach(clearStoredToken);

describe("cadastro profissional com convite (develop 1a3d9c9)", () => {
  it("envia somente identificação e preserva id numérico de vínculo e UUID de paciente", async () => {
    const pacienteId = "5c56a74b-d6b1-4476-a62a-924664a12226";
    server.use(
      http.post(`${config.apiBaseUrl}/api/v1/pacientes`, async ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer mock-token:profissional-1");
        expect(await request.json()).toEqual({
          nome: "Paciente Teste",
          email: "teste@example.com",
          telefone: null,
          data_nascimento: "1990-05-20",
        });
        return HttpResponse.json(
          {
            id: 42,
            vinculo_id: 42,
            role: "paciente",
            paciente_id: pacienteId,
            paciente_nome: "Paciente Teste",
            paciente_email: "teste@example.com",
            data_vinculo: "2026-10-20T00:00:00Z",
            ativo: true,
            convite_pendente: true,
          },
          { status: 201 },
        );
      }),
    );
    expect(
      await pacienteService.criar({
        nome: " Paciente Teste ",
        email: "teste@example.com",
        dataNascimento: "1990-05-20",
      }),
    ).toEqual({
      pacienteId,
      nome: "Paciente Teste",
      email: "teste@example.com",
      convitePendente: true,
    });
  });
});
