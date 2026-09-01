"use client";

import { Mail, Info, ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useLogout } from "@/hooks/use-auth";

const ADMIN_PLACEHOLDER = { nome: "Dr. Marcelo Saldanha", email: "admin@hality.com" };

export default function AdminPerfilPage() {
  const [sobreAberto, setSobreAberto] = useState(false);
  const logout = useLogout();

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col items-center p-8 pb-13 text-center"
        style={{ background: "var(--gradient-brand)" }}
      >
        <AvatarWithRole nome={ADMIN_PLACEHOLDER.nome} size={72} role="admin" className="mb-2.5" />
        <div className="font-heading mb-1 text-xl font-extrabold text-white">
          {ADMIN_PLACEHOLDER.nome}
        </div>
        <div className="text-sm text-white/55">Administrador</div>
      </div>

      <div className="mt-6 flex flex-col gap-3.5 px-4">
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
            <Mail className="text-gray-3 h-4 w-4 shrink-0" />
            <div>
              <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                E-mail
              </div>
              <div className="text-[15px]">{ADMIN_PLACEHOLDER.email}</div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-lg p-0 shadow-sm ring-0">
          <button
            onClick={() => setSobreAberto(true)}
            className="flex w-full items-center gap-3.5 p-4 text-left"
          >
            <div className="bg-background flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
              <Info className="text-primary h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <div className="font-heading text-sm font-bold">Sobre</div>
              <div className="text-muted-foreground text-xs">Equipe e desenvolvimento do app</div>
            </div>
            <ChevronRight className="text-gray-3 h-4 w-4" />
          </button>
        </Card>

        <Button
          variant="danger"
          className="w-full"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4.5 w-4.5" /> Sair da conta
        </Button>
        <div className="h-2" />
      </div>

      <Dialog open={sobreAberto} onOpenChange={setSobreAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sobre</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Check Your Breath — equipe AGES.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
