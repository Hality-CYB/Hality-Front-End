import { beforeAll, describe, expect, it } from "vitest";
import type { z } from "zod";
import { backendUserSchema } from "@/types/usuario";
import { backendHomeSchema } from "@/types/home";
import {
  backendDiagnosticoDetailSchema,
  backendDiagnosticoListResponseSchema,
  backendDiagnosticoProfissionalDetalheSchema,
  backendDiagnosticoProfissionalListSchema,
} from "@/types/diagnostico";
import { backendResumoProfissionalSchema } from "@/types/profissional";
import { backendPacienteDetailSchema, backendPacienteListResponseSchema } from "@/types/paciente";
import {
  backendAdminDiagnosticoDetalheSchema,
  backendAdminDiagnosticoListSchema,
  backendAdminResumoSchema,
  backendAdminUsuarioListSchema,
  backendAdminVinculoListSchema,
} from "@/types/admin";
import { backendConteudoListSchema } from "@/types/dica";
import { backendConsentimentosSchema, backendTermosSchema } from "@/types/consentimento";

/**
 * Smoke sem mock (TASK-209): entra no back real com um usuário de cada papel
 * e valida cada resposta com os mesmos schemas que o app usa. Se o back mudar
 * um contrato, o teste aponta a rota e o campo. Configuração em `.env.example`.
 */

const API = process.env.SMOKE_API_URL ?? "http://localhost:8000";
const SENHA = process.env.SMOKE_SENHA ?? "";
const EMAILS = {
  admin: process.env.SMOKE_EMAIL_ADMIN ?? "admin@hality.com",
  profissional: process.env.SMOKE_EMAIL_PROFISSIONAL ?? "ana.souza@hality.com",
  paciente: process.env.SMOKE_EMAIL_PACIENTE ?? "carla.mendes@example.com",
};
type Papel = keyof typeof EMAILS;
const tokens = {} as Record<Papel, string>;

async function entrar(email: string): Promise<string> {
  const resposta = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password: SENHA }),
  });
  if (!resposta.ok) throw new Error(`login de ${email} falhou: HTTP ${resposta.status}`);
  return ((await resposta.json()) as { access_token: string }).access_token;
}

/** GET autenticado + validação com o schema do front; devolve o corpo já validado. */
async function validar<S extends z.ZodTypeAny>(
  papel: Papel,
  rota: string,
  schema: S,
): Promise<z.infer<S>> {
  const resposta = await fetch(`${API}/api/v1${rota}`, {
    headers: { Authorization: `Bearer ${tokens[papel]}` },
  });
  expect(resposta.status, `${rota} como ${papel}`).toBe(200);
  const resultado = schema.safeParse(await resposta.json());
  if (!resultado.success) {
    throw new Error(`${rota}: contrato diferente do front\n${resultado.error.message}`);
  }
  return resultado.data;
}

beforeAll(async () => {
  if (!SENHA) throw new Error("Defina SMOKE_SENHA (a SEED_PASSWORD do back). Ver .env.example.");
  for (const papel of Object.keys(EMAILS) as Papel[]) tokens[papel] = await entrar(EMAILS[papel]);
});

describe("paciente", () => {
  it("perfil, home e diagnósticos", async () => {
    await validar("paciente", "/users/me", backendUserSchema);
    await validar("paciente", "/home", backendHomeSchema);
    await validar("paciente", "/consentimentos/termos", backendTermosSchema);
    await validar("paciente", "/users/me/consentimentos", backendConsentimentosSchema);
    const lista = await validar(
      "paciente",
      "/diagnosticos?limite=5",
      backendDiagnosticoListResponseSchema,
    );
    const primeiro = lista.itens[0];
    if (primeiro) {
      await validar("paciente", `/diagnosticos/${primeiro.id}`, backendDiagnosticoDetailSchema);
    }
  });
});

describe("profissional", () => {
  it("resumo, diagnósticos e pacientes", async () => {
    await validar("profissional", "/users/me", backendUserSchema);
    await validar("profissional", "/profissional/resumo", backendResumoProfissionalSchema);
    const diagnosticos = await validar(
      "profissional",
      "/profissional/diagnosticos?limite=5",
      backendDiagnosticoProfissionalListSchema,
    );
    const diagnostico = diagnosticos.itens[0];
    if (diagnostico) {
      await validar(
        "profissional",
        `/profissional/diagnosticos/${diagnostico.id}`,
        backendDiagnosticoProfissionalDetalheSchema,
      );
    }
    const pacientes = await validar(
      "profissional",
      "/pacientes?limite=5",
      backendPacienteListResponseSchema,
    );
    const paciente = pacientes.itens[0];
    if (paciente) {
      await validar("profissional", `/pacientes/${paciente.id}`, backendPacienteDetailSchema);
    }
  });
});

describe("admin", () => {
  it("usuários, vínculos, conteúdos e resumo", async () => {
    await validar("admin", "/admin/usuarios?limite=5", backendAdminUsuarioListSchema);
    await validar("admin", "/admin/vinculos?limite=5", backendAdminVinculoListSchema);
    await validar("admin", "/admin/conteudos?page=1&limit=5", backendConteudoListSchema);
    await validar("admin", "/admin/resumo?timezone=UTC", backendAdminResumoSchema);
  });

  it("diagnósticos", async () => {
    const lista = await validar(
      "admin",
      "/admin/diagnosticos?limite=5",
      backendAdminDiagnosticoListSchema,
    );
    const primeiro = lista.itens[0];
    if (primeiro) {
      await validar(
        "admin",
        `/admin/diagnosticos/${primeiro.id}`,
        backendAdminDiagnosticoDetalheSchema,
      );
    }
  });
});
