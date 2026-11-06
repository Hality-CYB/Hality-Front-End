import { expect, test, type Page } from "@playwright/test";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";

const API_URL = `http://localhost:${process.env.E2E_API_PORT || "8000"}/api/v1`;
const PASSWORD = "HalityE2e123!";
const accounts = [
  {
    role: "paciente",
    email: "carla.mendes@example.com",
    greeting: /Carla Mendes/,
    homeApi: "/home",
    wrongRole: "admin",
    forbiddenApi: "/admin/usuarios",
  },
  {
    role: "profissional",
    email: "ana.souza@hality.com",
    greeting: /Dra\. Ana Souza/,
    homeApi: "/profissional/resumo",
    wrongRole: "admin",
    forbiddenApi: "/admin/usuarios",
  },
  {
    role: "admin",
    email: "admin@hality.com",
    greeting: /Olá, Admin/,
    homeApi: "/admin/resumo",
    wrongRole: "profissional",
    forbiddenApi: "/profissional/diagnosticos",
  },
];

async function login(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
}

for (const account of accounts) {
  test.describe(account.role, () => {
    test("login real, sessão persistente, RBAC e logout", async ({ page, context, request }) => {
      let refreshToken = "";
      await test.step("Login abre a home e carrega dados da API real", async () => {
        await page.goto("/login");
        const homeResponse = page.waitForResponse(
          (response) =>
            response.url().startsWith(API_URL + account.homeApi) &&
            response.request().method() === "GET",
        );
        await login(page, account.email);
        await expect(page).toHaveURL(`/${account.role}`);
        await expect(page.getByRole("heading", { name: account.greeting })).toBeVisible();
        expect((await homeResponse).status()).toBe(200);
        await expect(page.getByRole("link", { name: new RegExp(account.email) })).toBeVisible();
        const refreshCookie = (await context.cookies(API_URL + "/auth/refresh")).find(
          (cookie) => cookie.name === "refresh_token",
        );
        expect(refreshCookie).toMatchObject({ httpOnly: true });
        refreshToken = refreshCookie!.value;
      });

      await test.step("Reload mantém a sessão", async () => {
        await page.reload();
        await expect(page).toHaveURL(`/${account.role}`);
        await expect(page.getByRole("heading", { name: account.greeting })).toBeVisible();
      });

      await test.step("Rota de outro papel volta à própria home", async () => {
        await page.goto(`/${account.wrongRole}`);
        await expect(page).toHaveURL(`/${account.role}`);
        await expect(page.getByRole("heading", { name: account.greeting })).toBeVisible();
      });

      await test.step("API também nega leitura fora do papel", async () => {
        const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_STORAGE_KEY);
        expect(token).toBeTruthy();
        const response = await page.request.get(API_URL + account.forbiddenApi, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(403);
      });

      await test.step("Sair pelo perfil encerra a sessão", async () => {
        await page.getByRole("link", { name: new RegExp(account.email) }).click();
        await expect(page).toHaveURL(`/${account.role}/perfil`);
        await page.getByRole("button", { name: /Sair/ }).click();
        await expect(page).toHaveURL("/login");
        await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();
        expect(
          await page.evaluate((key) => localStorage.getItem(key), TOKEN_STORAGE_KEY),
        ).toBeNull();
        expect(
          (await context.cookies(API_URL + "/auth/refresh")).some(
            (cookie) => cookie.name === "refresh_token",
          ),
        ).toBe(false);
      });

      await test.step("Após logout, página protegida e API exigem novo login", async () => {
        await page.goto(`/${account.role}/perfil`);
        await expect(page).toHaveURL(
          `/login?redirect=${encodeURIComponent(`/${account.role}/perfil`)}`,
        );
        await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();
        expect((await page.request.get(API_URL + "/users/me")).status()).toBe(401);
        const replay = await request.post(API_URL + "/auth/refresh", {
          headers: { Cookie: `refresh_token=${refreshToken}` },
        });
        expect(replay.status()).toBe(401);
      });
    });

    test("deep link protegido retorna ao destino após login", async ({ page }) => {
      const destination = `/${account.role}/perfil`;
      await page.goto(destination);
      await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(destination)}`);
      await login(page, account.email);
      await expect(page).toHaveURL(destination);
      await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(destination);
      await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
    });
  });
}
