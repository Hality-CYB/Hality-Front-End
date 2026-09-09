import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login | Check Your Breath",
};

export default function LoginPage() {
  return <LoginForm />;
}
