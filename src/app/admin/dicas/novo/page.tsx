"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ConteudoForm } from "@/components/conteudo-form";
import {
  mensagemErroConteudo,
  useCriarConteudo,
  useEnviarMidia,
} from "@/hooks/use-conteudos-admin";
import { useClassificacoes } from "@/hooks/use-classificacoes";

export default function NovoConteudoPage() {
  const router = useRouter();
  const criar = useCriarConteudo();
  const classificacoes = useClassificacoes();
  const enviarMidia = useEnviarMidia();

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/admin/dicas"
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Conteúdos
        </Link>
        <h1 className="text-xl text-white">Novo conteúdo</h1>
      </div>
      <div className="p-4">
        <ConteudoForm
          classificacoes={classificacoes.data}
          classificacoesComErro={classificacoes.isError}
          onTentarClassificacoesDeNovo={() => classificacoes.refetch()}
          onEnviarMidia={enviarMidia}
          salvando={criar.isPending}
          erro={criar.isError ? mensagemErroConteudo(criar.error) : null}
          onSalvar={(input) =>
            criar.mutate(input, {
              onSuccess: () => router.push("/admin/dicas?aviso=publicado"),
            })
          }
        />
      </div>
    </div>
  );
}
