import type { Metadata } from "next";
import { EntradaPorLink } from "@/components/definir-senha-form";

export const metadata: Metadata = { title: "Primeiro acesso — CYB", referrer: "no-referrer" };

export default function PrimeiroAcessoPage() {
  return <EntradaPorLink finalidade="convite" />;
}
