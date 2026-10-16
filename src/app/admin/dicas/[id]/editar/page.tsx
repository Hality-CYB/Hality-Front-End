"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DicaForm } from "@/components/dica-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAtualizarDica, useDica, useRemoverDica } from "@/hooks/use-dicas";

export default function EditarDicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: dica } = useDica(id);
  const atualizar = useAtualizarDica();
  const remover = useRemoverDica();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  if (!dica) return null;

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/admin/dicas"
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Conteúdos
        </Link>
        <h1 className="text-xl text-white">Editar dica</h1>
      </div>
      <div className="flex flex-col gap-3.5 p-4">
        <DicaForm
          dica={dica}
          salvando={atualizar.isPending}
          erro={atualizar.isError ? "Não foi possível salvar a dica. Tente novamente." : null}
          onSalvar={(input) =>
            atualizar.mutate({ id, ...input }, { onSuccess: () => router.push("/admin/dicas") })
          }
        />
        <Button variant="danger" onClick={() => setConfirmarExclusao(true)}>
          <Trash2 className="h-4 w-4" /> Excluir dica
        </Button>
      </div>

      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dica</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{dica.titulo}</strong> sai da home e das orientações e não pode ser
              recuperada. Para só tirar do ar, salve como rascunho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => remover.mutate(id, { onSuccess: () => router.push("/admin/dicas") })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
