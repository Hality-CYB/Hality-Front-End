"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSessaoAtual } from "@/lib/auth/session-context";

/**
 * Home mínima do paciente — só o suficiente pra `/paciente` (item "Home" do
 * NAV_ITEMS) e o `voltarHref` do wizard terem uma tela real. O dashboard
 * completo (histórico, gráfico de progresso etc.) fica pra quando essa
 * área for desenhada de verdade.
 */
export default function PacienteHomePage() {
  const sessao = useSessaoAtual();

  return (
    <div className="p-4">
      <Card className="mx-auto flex max-w-135 flex-col items-center gap-3.5 rounded-lg p-6 text-center shadow-sm ring-0">
        <div className="bg-secondary text-primary flex h-14 w-14 items-center justify-center rounded-[18px]">
          <Camera className="h-7 w-7" />
        </div>
        <h2 className="text-lg">Olá, {sessao.nome.split(" ")[0]}</h2>
        <p className="text-muted-foreground text-sm">
          Pronto para fazer seu diagnóstico de hálito?
        </p>
        <Button size="lg" asChild>
          <Link href="/paciente/avaliacao">Iniciar diagnóstico</Link>
        </Button>
      </Card>
    </div>
  );
}
