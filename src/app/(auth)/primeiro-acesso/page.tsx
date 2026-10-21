import type { Metadata } from "next";
import { IdentityLinkEntry } from "@/components/identity-password-form";

export const metadata: Metadata = { title: "Primeiro acesso — CYB", referrer: "no-referrer" };

export default function PrimeiroAcessoPage() {
  return <IdentityLinkEntry purpose="invitation" />;
}
