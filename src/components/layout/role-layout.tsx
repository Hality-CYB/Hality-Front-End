import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { seedUsuarios } from "@/services/mocks/seed-data";
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

  /**
   * Busca direto em seedUsuarios (não via usuario-service/apiClient): esta
   * é uma Server Component rodando fora do navegador, então o worker do
   * MSW (que só intercepta fetch do lado cliente) nunca entraria em ação
   * aqui — mesma razão documentada em app/api/auth/login/route.ts. Troca
   * pra usuario-service quando o back-end tiver endpoint de usuário real.
   */
  const usuario = seedUsuarios.find((u) => u.id === sessao.id);
  const nome = usuario?.nome ?? "Usuário";
  const email = usuario?.email ?? "";

  return (
    <AppShell role={role} usuarioId={sessao.id} nome={nome} email={email}>
      {children}
    </AppShell>
  );
}
