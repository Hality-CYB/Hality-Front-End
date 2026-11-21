import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { getStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";
import RegistroProfissionalPage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/auth-card", () => ({
  AuthCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
const URL = `${config.apiBaseUrl}/api/v1/auth/profissionais/solicitacoes`;

function preparar() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RegistroProfissionalPage />
    </QueryClientProvider>,
  );
  for (const [label, value] of [
    ["Nome completo *", "Profissional Teste"],
    ["E-mail *", "profissional@example.com"],
    ["Registro profissional *", "CRO-RS 12345"],
    ["Especialidade *", "Odontologia"],
  ] as const) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

it("explica a aprovação, exige termos e não cria sessão ao solicitar", async () => {
  const enviar = vi.fn();
  server.use(
    http.post(URL, async ({ request }) => {
      enviar(await request.json());
      return HttpResponse.json({ message: "Enviado" }, { status: 202 });
    }),
  );
  preparar();
  expect(screen.queryByLabelText(/Senha/)).not.toBeInTheDocument();
  const termos = screen.getByRole("checkbox", { name: /Termos de Uso/ });
  expect(termos).not.toBeChecked();
  await userEvent.click(screen.getByRole("button", { name: "Solicitar acesso profissional" }));
  expect(enviar).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Aceite os Termos");
  await userEvent.click(termos);
  await userEvent.click(screen.getByRole("button", { name: "Solicitar acesso profissional" }));
  expect(await screen.findByRole("heading", { name: "Solicitação enviada" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("somente após aprovação");
  expect(enviar).toHaveBeenCalledWith({
    nome: "Profissional Teste",
    email: "profissional@example.com",
    registro_profissional: "CRO-RS 12345",
    especialidade: "Odontologia",
    aceita_termos: true,
  });
  expect(getStoredToken()).toBeNull();
});

it.each([409, 422, 429, 503])(
  "mantém os dados para corrigir ou tentar novamente no erro %s",
  async (status) => {
    server.use(http.post(URL, () => HttpResponse.json({ detail: "Erro" }, { status })));
    preparar();
    await userEvent.click(screen.getByRole("checkbox", { name: /Termos de Uso/ }));
    await userEvent.click(screen.getByRole("button", { name: "Solicitar acesso profissional" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      status === 409
        ? "já possui"
        : status === 422
          ? "dados profissionais"
          : status === 429
            ? "Muitas solicitações"
            : "Não foi possível",
    );
    expect(screen.getByLabelText("E-mail *")).toHaveValue("profissional@example.com");
  },
);

it("recusa campos compostos só por espaços antes de enviar", async () => {
  const enviar = vi.fn(() => HttpResponse.json({}, { status: 202 }));
  server.use(http.post(URL, enviar));
  preparar();
  fireEvent.change(screen.getByLabelText("Nome completo *"), { target: { value: "   " } });
  await userEvent.click(screen.getByRole("checkbox", { name: /Termos de Uso/ }));
  await userEvent.click(screen.getByRole("button", { name: "Solicitar acesso profissional" }));
  expect(screen.getByRole("alert")).toHaveTextContent("pelo menos dois caracteres");
  expect(enviar).not.toHaveBeenCalled();
});
