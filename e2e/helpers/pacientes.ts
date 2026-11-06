import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { obterLinkEmail } from "../emails";
import { API_URL, SENHA } from "./config";

const termosSchema = z.object({
  itens: z.array(
    z.object({ finalidade: z.string(), versao: z.string(), obrigatorio: z.boolean() }),
  ),
});

/** Cadastra via API e confirma pelo link real, deixando a página no login. */
export async function criarPacienteConfirmado({
  request,
  page,
  nome = "Paciente E2E",
  email = `paciente-${randomUUID()}@example.com`,
}: {
  request: APIRequestContext;
  page: Page;
  nome?: string;
  email?: string;
}) {
  const termosResponse = await request.get(`${API_URL}/consentimentos/termos`);
  expect(termosResponse.ok()).toBeTruthy();
  const termos = termosSchema.parse(await termosResponse.json());
  const registro = await request.post(`${API_URL}/auth/register`, {
    data: {
      name: nome,
      email,
      password: SENHA,
      data_nascimento: "1990-01-01",
      consentimentos: termos.itens.map((termo) => ({
        finalidade: termo.finalidade,
        versao: termo.versao,
        aceito: termo.obrigatorio,
      })),
    },
  });
  expect(registro.status()).toBe(201);
  const link = await obterLinkEmail({ destinatario: email, finalidade: "email_verification" });
  await page.goto(link);
  await expect(page).toHaveURL("/login");
  return { email, senha: SENHA };
}
