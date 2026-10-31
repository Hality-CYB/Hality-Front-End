import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoleLayout } from "@/components/layout/role-layout";
import { clearStoredToken } from "@/lib/session";

const navigation = vi.hoisted(() => ({
  pathname: "/paciente/perfil",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

function renderRoleLayout(role: "paciente" | "profissional" | "admin") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RoleLayout role={role}>Conteúdo protegido</RoleLayout>
    </QueryClientProvider>,
  );
}

describe("RoleLayout sem sessão", () => {
  afterEach(() => {
    cleanup();
    clearStoredToken();
    navigation.pathname = "/paciente/perfil";
    navigation.replace.mockClear();
  });

  it("preserva a rota completa da área ao redirecionar para o login", async () => {
    navigation.pathname = "/paciente/perfil";

    renderRoleLayout("paciente");

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/login?redirect=%2Fpaciente%2Fperfil");
    });
  });

  it("usa a rota base quando o caminho não pertence à área informada", async () => {
    navigation.pathname = "/admin/usuarios";

    renderRoleLayout("paciente");

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/login?redirect=%2Fpaciente");
    });
  });
});
