"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { CarregandoPagina, ErroPagina } from "@/components/estado-pagina";
import { ehNaoEncontrado } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { ConteudoForm } from "@/components/conteudo-form";
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
import {
  mensagemErroConteudo,
  useEnviarMidia,
  useAtualizarConteudo,
  useConteudoAdmin,
  useRemoverConteudo,
} from "@/hooks/use-conteudos-admin";
import { useClassificacoes } from "@/hooks/use-classificacoes";
import { Alert } from "@/components/alert";

export default function EditarConteudoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: conteudo, isError, error: erro, refetch } = useConteudoAdmin(id);
  const atualizar = useAtualizarConteudo();
  const remover = useRemoverConteudo();
  const classificacoes = useClassificacoes();
  const enviarMidia = useEnviarMidia();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  if (isError) {
    return (
      <ErroPagina
        titulo={ehNaoEncontrado(erro) ? "Conteúdo não encontrado" : "Não foi possível carregar"}
        descricao={
          ehNaoEncontrado(erro)
            ? "Ele pode ter sido excluído."
            : "Confira sua conexão e tente de novo."
        }
        onTentarDeNovo={ehNaoEncontrado(erro) ? undefined : () => refetch()}
        voltar={{ href: "/admin/dicas", label: "Voltar para conteúdos" }}
      />
    );
  }
  if (!conteudo) return <CarregandoPagina />;

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/admin/dicas"
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Conteúdos
        </Link>
        <h1 className="text-xl text-white">Editar conteúdo</h1>
      </div>
      <div className="flex flex-col gap-3.5 p-4">
        <ConteudoForm
          conteudo={conteudo}
          classificacoes={classificacoes.data}
          classificacoesComErro={classificacoes.isError}
          onTentarClassificacoesDeNovo={() => classificacoes.refetch()}
          onEnviarMidia={enviarMidia}
          salvando={atualizar.isPending}
          erro={atualizar.isError ? mensagemErroConteudo(atualizar.error) : null}
          onSalvar={(input) =>
            atualizar.mutate(
              { id, ...input },
              {
                onSuccess: () => router.push("/admin/dicas?aviso=salvo"),
              },
            )
          }
        />
        {remover.isError && <Alert message={mensagemErroConteudo(remover.error, "excluir")} />}
        <Button
          variant="danger"
          disabled={remover.isPending}
          onClick={() => setConfirmarExclusao(true)}
        >
          <Trash2 className="h-4 w-4" /> Excluir conteúdo
        </Button>
      </div>

      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{conteudo.titulo}</strong> sai de todos os destinos e não pode ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() =>
                remover.mutate(id, { onSuccess: () => router.push("/admin/dicas?aviso=excluido") })
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
