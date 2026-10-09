import { RoleLayout } from "@/components/layout/role-layout";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="admin">{children}</RoleLayout>;
}
