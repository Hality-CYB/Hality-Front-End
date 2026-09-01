"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useUsuario } from "@/hooks/use-usuarios";

export default function UsuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: usuario } = useUsuario(id);

  if (!usuario) return null;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/admin/usuarios"
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Usuários
        </Link>
        <div className="flex items-center gap-3.5">
          <AvatarWithRole
            nome={usuario.nome}
            size={56}
            role={usuario.role === "paciente" ? undefined : usuario.role}
          />
          <div>
            <div className="font-heading text-lg font-extrabold text-white">{usuario.nome}</div>
            <div className="text-sm text-white/60">{usuario.email}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <h2 className="mb-3.5 text-lg">Dados</h2>
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> E-mail
              </span>
              <span className="font-heading font-semibold">{usuario.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Papel</span>
              <Badge>{usuario.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cadastro em</span>
              <span className="font-heading font-semibold">
                {new Date(usuario.criadoEm).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
