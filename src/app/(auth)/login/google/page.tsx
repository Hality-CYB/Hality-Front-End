import type { Metadata } from "next";
import { RetornoLoginGoogle } from "@/components/retorno-login-google";

export const metadata: Metadata = {
  title: "Entrar com Google — CYB",
  referrer: "no-referrer",
};

export default function LoginGooglePage() {
  return <RetornoLoginGoogle />;
}
