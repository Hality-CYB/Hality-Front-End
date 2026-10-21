import type { Metadata } from "next";
import { IdentityLinkEntry } from "@/components/identity-password-form";

export const metadata: Metadata = { title: "Redefinir senha — CYB", referrer: "no-referrer" };

export default function RedefinirSenhaPage() {
  return <IdentityLinkEntry purpose="password_reset" />;
}
