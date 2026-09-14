import { RoleLayout } from "@/components/layout/role-layout";
import type { ReactNode } from "react";

export default function ProfissionalLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="profissional">{children}</RoleLayout>;
}
