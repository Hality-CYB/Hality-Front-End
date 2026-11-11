import { chromium } from "playwright";
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1100, height: 950 },
    locale: "pt-BR",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  let linked = false;
  let sent = null;
  const terms = {
    itens: [
      {
        finalidade: "health_data",
        versao: "v1",
        obrigatorio: true,
        titulo: "Tratamento de dados de saúde",
        texto: "Termos de dados de saúde.",
      },
      {
        finalidade: "image_training",
        versao: "v1",
        obrigatorio: false,
        titulo: "Uso da imagem para treinamento",
        texto: "Termos de imagem.",
      },
    ],
  };
  const user = {
    id: "b1234567-89ab-4cde-8fab-0123456789ab",
    email: "paciente@example.com",
    name: "Maria Silva",
    phone: null,
    data_nascimento: "1990-01-01",
    role: "paciente",
    is_active: true,
    is_verified: true,
  };
  await page.route("http://localhost:8000/**", async (route) => {
    let req = route.request(),
      path = new URL(req.url()).pathname,
      headers = {
        "access-control-allow-origin": "http://localhost:3017",
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
      };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    let json = {};
    let status = 200;
    if (path.endsWith("/consentimentos/termos")) json = terms;
    else if (path.endsWith("/users/me")) json = user;
    else if (path.endsWith("/auth/google/link/start"))
      json = { url: "https://accounts.google.com/o/oauth2/v2/auth?state=teste" };
    else if (path.endsWith("/auth/google/link/complete")) {
      linked = true;
      status = 204;
    } else if (path.endsWith("/auth/google/link"))
      json = { vinculado: linked, email: linked ? "maria@example.com" : null };
    else if (path.endsWith("/auth/google/exchange")) {
      sent = req.postDataJSON();
      json = { access_token: "token-teste", token_type: "bearer" };
    } else {
      status = 404;
      json = { detail: "não encontrado" };
    }
    return route.fulfill(status === 204 ? { status, headers } : { status, headers, json });
  });
  await page.route("https://accounts.google.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>Google simulado</title><p>Autenticação simulada para teste visual</p>",
    }),
  );
  await page.goto("http://localhost:3017/login/google?code=teste&etapa=consentimento");
  await page.getByRole("heading", { name: "Defina uma senha" }).waitFor();
  await page.getByLabel("Senha", { exact: true }).fill("SenhaSegura123!");
  await page.getByLabel("Confirmar senha").fill("SenhaSegura123!");
  await page.screenshot({ path: ".github/pr-screenshots/google/01-cadastro.png", fullPage: true });
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Aceitar e continuar" }).click();
  await page.waitForURL("**/paciente");
  if (!sent || sent.senha !== "SenhaSegura123!" || !sent.consentimentos[0].aceito)
    throw Error("Cadastro nao enviou senha e consentimento");
  await page.evaluate(() => localStorage.setItem("hality:access_token", "token-teste"));
  await page.goto("http://localhost:3017/paciente/perfil");
  await page.getByText("Vincular conta Google").waitFor();
  await page.screenshot({ path: ".github/pr-screenshots/google/02-vincular.png", fullPage: true });
  await page.getByRole("button", { name: /Conta Google/ }).click();
  await page.waitForURL("https://accounts.google.com/**");
  await page.goto("http://localhost:3017/login/google?code=teste-vinculo&etapa=vinculo");
  await page.getByText("Vinculado a maria@example.com").waitFor({ timeout: 20000 });
  await page.screenshot({ path: ".github/pr-screenshots/google/03-vinculado.png", fullPage: true });
  console.log("Capturas concluídas; retorno e API simulados.");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
