import { RoleLayout } from "@/components/layout/role-layout";
import type { ReactNode } from "react";

export default function PacienteLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="paciente">{children}</RoleLayout>;
}
