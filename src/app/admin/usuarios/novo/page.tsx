"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Stethoscope, Shield, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCriarUsuario } from "@/hooks/use-usuarios";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/usuario";

const OPCOES_ROLE: { valor: Role; label: string; Icon: typeof User; bg: string }[] = [
  { valor: "paciente", label: "Paciente", Icon: User, bg: "bg-secondary" },
  { valor: "profissional", label: "Profissional", Icon: Stethoscope, bg: "bg-[#DBEAFE]" },
  { valor: "admin", label: "Admin", Icon: Shield, bg: "bg-[#FEF3C7]" },
];

export default function NovoUsuarioPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("paciente");
  const criar = useCriarUsuario();

  async function handleSubmit() {
    await criar.mutateAsync({ nome: nome.trim(), email: email.trim(), role });
    router.push("/admin/usuarios");
  }

  return (
    <div className="flex flex-col p-4">
      <h1 className="mb-4 text-xl">Criar usuário</h1>
      <Card className="rounded-lg p-5 shadow-sm ring-0">
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Nome completo
            </label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do usuário..."
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              E-mail
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Tipo de usuário
            </label>
            <div className="flex flex-col gap-2">
              {OPCOES_ROLE.map(({ valor, label, Icon, bg }) => (
                <button
                  key={valor}
                  onClick={() => setRole(valor)}
                  className={cn(
                    "border-1.5 flex items-center gap-3 rounded-xl p-3.5 text-left",
                    role === valor ? "border-primary bg-secondary" : "border-border bg-card",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px]",
                      bg,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-heading text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <Button
            size="lg"
            disabled={!nome.trim() || !email.trim() || criar.isPending}
            onClick={handleSubmit}
          >
            <Check className="h-4 w-4" /> Criar usuário
          </Button>
        </div>
      </Card>
    </div>
  );
}
