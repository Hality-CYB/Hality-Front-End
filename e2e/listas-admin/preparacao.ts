import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { tokenDe } from "../helpers/auth";
import { API_URL, SENHA } from "../helpers/config";
import { consultarBanco } from "../helpers/banco";

const usuarioCriadoSchema = z.object({
  id: z.string(),
  convite_pendente: z.boolean(),
});
const paginaUsuariosSchema = z.object({
  itens: z.array(z.object({ id: z.string(), email: z.string() })),
});
const versaoSchema = z.object({ version: z.number() });

export type PapelCriado = "paciente" | "profissional";
export type StatusAjustado = "falha" | "processando";

export function tokenDeLista() {
  return `lista-${randomUUID()}`;
}

export function diaIsolado() {
  const deslocamento = Math.floor(Math.random() * 3000);
  const iso = new Date(Date.UTC(2000, 0, 1) + deslocamento * 86_400_000).toISOString().slice(0, 10);
  const [, mes, dia] = iso.split("-");
  if (mes === undefined || dia === undefined) throw new Error(`dia isolado inválido: ${iso}`);
  return { iso, instante: `${iso} 15:00:00+00`, rotulo: `${dia}/${mes}–${dia}/${mes}` };
}

export function exigir<T>(valor: T | undefined, mensagem: string): T {
  if (valor === undefined) throw new Error(mensagem);
  return valor;
}

export async function criarProfissionalDireto({
  request,
  headers,
  nome,
  email,
}: {
  request: APIRequestContext;
  headers: { Authorization: string };
  nome: string;
  email: string;
}) {
  const resposta = await request.post(`${API_URL}/admin/usuarios`, {
    headers,
    data: { nome, email, role: "profissional", senha: SENHA, enviar_convite: false },
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
  const criado = usuarioCriadoSchema.parse(await resposta.json());
  expect(criado.convite_pendente).toBe(false);
  return criado;
}

export async function idPorEmail({
  request,
  headers,
  email,
}: {
  request: APIRequestContext;
  headers: { Authorization: string };
  email: string;
}) {
  const resposta = await request.get(
    `${API_URL}/admin/usuarios?busca=${encodeURIComponent(email)}`,
    { headers },
  );
  expect(resposta.ok()).toBeTruthy();
  const pagina = paginaUsuariosSchema.parse(await resposta.json());
  return exigir(
    pagina.itens.find((item) => item.email === email),
    `usuário ${email} não apareceu na busca`,
  ).id;
}

export async function vincular({
  request,
  headers,
  pacienteId,
  profissionalId,
}: {
  request: APIRequestContext;
  headers: { Authorization: string };
  pacienteId: string;
  profissionalId: string;
}) {
  const resposta = await request.post(`${API_URL}/admin/vinculos`, {
    headers,
    data: { paciente_id: pacienteId, profissional_id: profissionalId },
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
}

export async function revisarComOCodigoDaIa({
  request,
  email,
  diagnosticoId,
  codigo,
}: {
  request: APIRequestContext;
  email: string;
  diagnosticoId: number;
  codigo: string;
}) {
  const headers = await tokenDe({ request, email });
  const detalhe = await request.get(`${API_URL}/profissional/diagnosticos/${diagnosticoId}`, {
    headers,
  });
  expect(detalhe.ok(), await detalhe.text()).toBeTruthy();
  const { version } = versaoSchema.parse(await detalhe.json());
  const revisao = await request.patch(
    `${API_URL}/profissional/diagnosticos/${diagnosticoId}/revisao`,
    { headers, data: { classificacao: codigo, version } },
  );
  expect(revisao.ok(), await revisao.text()).toBeTruthy();
}

export function ajustarDiagnostico({
  id,
  instante,
  status,
}: {
  id: number;
  instante: string;
  status?: StatusAjustado;
}) {
  const campos = [`data_diagnostico = '${instante}'`];
  if (status) campos.push(`status = '${status}'`, "classificacao_id = NULL");
  const resultado = consultarBanco(`UPDATE diagnosticos SET ${campos.join(", ")} WHERE id = ${id}`);
  expect(resultado).toBe("UPDATE 1");
}

export async function criarUsuarios({
  request,
  headers,
  usuarios,
}: {
  request: APIRequestContext;
  headers: { Authorization: string };
  usuarios: { nome: string; email: string; role: PapelCriado }[];
}) {
  for (const usuario of usuarios) {
    const resposta = await request.post(`${API_URL}/admin/usuarios`, {
      headers,
      data: { ...usuario, senha: SENHA, enviar_convite: false },
    });
    expect(resposta.status(), await resposta.text()).toBe(201);
  }
}

export async function rolarLista(page: Page) {
  await page
    .locator("div.overflow-y-auto")
    .first()
    .evaluate((elemento) => {
      elemento.scrollTop = elemento.scrollHeight;
    });
}
