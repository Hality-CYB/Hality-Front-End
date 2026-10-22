import { afterEach, expect, it, vi } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { apiClient } from "@/lib/api-client";
import { config } from "@/lib/config";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";

const profileUrl = `${config.apiBaseUrl}/api/v1/users/me`;
const refreshUrl = `${config.apiBaseUrl}/api/v1/auth/refresh`;
afterEach(() => {
  clearStoredToken();
  vi.restoreAllMocks();
});

it("preserva a renovação única de sessão para chamadas autenticadas paralelas", async () => {
  setStoredToken("access-antigo");
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  let refreshes = 0;
  server.use(
    http.get(profileUrl, ({ request }) =>
      request.headers.get("authorization") === "Bearer access-novo"
        ? HttpResponse.json({ id: "perfil" })
        : new HttpResponse(null, { status: 401 }),
    ),
    http.post(refreshUrl, async () => {
      refreshes++;
      await delay(30);
      return HttpResponse.json({ access_token: "access-novo", token_type: "bearer" });
    }),
  );
  const responses = await Promise.all([
    apiClient.get("/api/v1/users/me"),
    apiClient.get("/api/v1/users/me"),
  ]);
  expect(responses).toEqual([{ id: "perfil" }, { id: "perfil" }]);
  expect(refreshes).toBe(1);
  expect(getStoredToken()).toBe("access-novo");
  expect(fetchSpy).toHaveBeenCalledWith(refreshUrl, { method: "POST", credentials: "include" });
});

it("continua limpando a sessão autenticada quando o refresh falha", async () => {
  setStoredToken("access-invalido");
  server.use(
    http.get(profileUrl, () => new HttpResponse(null, { status: 401 })),
    http.post(refreshUrl, () => new HttpResponse(null, { status: 401 })),
  );
  await expect(apiClient.get("/api/v1/users/me")).rejects.toMatchObject({ status: 401 });
  expect(getStoredToken()).toBeNull();
});

it("remove Authorization explícito de chamadas públicas", async () => {
  server.use(
    http.post(`${config.apiBaseUrl}/api/v1/auth/invitation/confirm`, ({ request }) => {
      expect(request.headers.get("authorization")).toBeNull();
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await apiClient.post(
    "/api/v1/auth/invitation/confirm",
    {},
    { autenticada: false, headers: { authorization: "Bearer nao-enviar" } },
  );
});
