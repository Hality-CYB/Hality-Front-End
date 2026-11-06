import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { API_URL, SENHA } from "./config";

const tokenSchema = z.object({ access_token: z.string().min(1) });

/** Envia o formulário atual sem navegar, preservando redirects e deep links. */
export async function entrar({
  page,
  email,
  senha = SENHA,
}: {
  page: Page;
  email: string;
  senha?: string;
}) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Login", exact: true }).click();
}

export async function tokenDe({
  request,
  email,
  senha = SENHA,
}: {
  request: APIRequestContext;
  email: string;
  senha?: string;
}) {
  const login = await request.post(`${API_URL}/auth/login`, {
    form: { username: email, password: senha },
  });
  expect(login.ok()).toBeTruthy();
  const { access_token: token } = tokenSchema.parse(await login.json());
  return { Authorization: `Bearer ${token}` };
}
