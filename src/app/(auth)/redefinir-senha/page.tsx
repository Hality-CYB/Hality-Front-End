import type { Metadata } from "next";
import { EntradaPorLink } from "@/components/definir-senha-form";

export const metadata: Metadata = { title: "Redefinir senha — CYB", referrer: "no-referrer" };

export default function RedefinirSenhaPage() {
  return <EntradaPorLink finalidade="recuperacao" />;
}
