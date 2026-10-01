import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import { pacientesMock, vinculadoEmMock } from "@/services/mocks/mock-db";
import { seedUsuarios } from "@/services/mocks/seed-data";

const url = (path: string) => `${config.apiBaseUrl}${path}`;
const criarVinculoSchema = z.object({ paciente_email: z.email() });
let proximoId = 100;

/** Espelha `POST /vinculos` (PR #88 do back): vincula um paciente já cadastrado, pelo e-mail. */
export const vinculosHandlers = [
  http.post(url("/api/v1/vinculos"), async ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    if (usuario.role !== "profissional") {
      return HttpResponse.json({ detail: "acesso restrito a profissionais" }, { status: 403 });
    }

    const body = criarVinculoSchema.safeParse(await request.json());
    if (!body.success) {
      return HttpResponse.json({ detail: "e-mail inválido" }, { status: 422 });
    }
    const email = body.data.paciente_email.toLowerCase();

    const index = pacientesMock.findIndex((p) => p.email.toLowerCase() === email);
    const paciente = pacientesMock[index];
    if (!paciente) {
      const outroPapel = seedUsuarios.some((u) => u.email.toLowerCase() === email);
      return HttpResponse.json(
        { detail: outroPapel ? "usuário não é um paciente" : "paciente não encontrado" },
        { status: 422 },
      );
    }
    if (paciente.profissionalVinculadoId === usuario.id) {
      return HttpResponse.json(
        { detail: "paciente já vinculado a este profissional" },
        { status: 409 },
      );
    }

    const vinculadoEm = new Date().toISOString();
    pacientesMock[index] = { ...paciente, profissionalVinculadoId: usuario.id };
    vinculadoEmMock.set(paciente.id, vinculadoEm);

    return HttpResponse.json(
      {
        id: proximoId++,
        paciente_id: paciente.id,
        paciente_nome: paciente.nome,
        paciente_email: paciente.email,
        data_vinculo: vinculadoEm,
        ativo: true,
      },
      { status: 201 },
    );
  }),
];
