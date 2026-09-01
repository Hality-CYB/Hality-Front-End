import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import type { Role } from "@/types/usuario";
import type { ReactNode } from "react";

/**
 * Server Component — chama a DAL de sessão (Client Component não pode
 * importar server-only) e repassa o usuário verificado como prop pro
 * AppShell (Client Component). Usado pelos 3 `app/<role>/layout.tsx`,
 * que ficam só um `<RoleLayout role="...">` cada.
 *
 * Isso é defesa em profundidade, não a única checagem: o proxy já fez um
 * gate otimista antes de chegar aqui, e cada endpoint do back-end precisa
 * reverificar por request (layouts não re-executam em navegação
 * client-side dentro do mesmo segmento).
 */
export async function RoleLayout({ role, children }: { role: Role; children: ReactNode }) {
  const sessao = await verifySession();

  if (!sessao) {
    redirect(`/login?redirect=/${role}`);
  }
  if (sessao.role !== role) {
    redirect(`/${sessao.role}`);
  }

  // TODO fase 2+: buscar nome/email reais via usuario-service a partir de sessao.id
  const nome =
    sessao.role === "admin"
      ? "Admin"
      : sessao.role === "profissional"
        ? "Profissional"
        : "Paciente";
  const email = "";

  return (
    <AppShell role={role} nome={nome} email={email}>
      {children}
    </AppShell>
  );
}
