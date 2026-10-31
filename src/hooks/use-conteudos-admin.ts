"use client";

import { useCallback } from "react";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { conteudoAdminService, type FiltroConteudos } from "@/services/conteudo-admin-service";
import type { ConteudoAdminInput } from "@/types/conteudo-admin";

/** Conteúdos do admin (`/admin/conteudos`). Salvar também invalida a home. */
export function useConteudosAdmin(
  filtro: FiltroConteudos = {},
  opcoes: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["conteudos-admin", "lista", filtro],
    queryFn: () => conteudoAdminService.listar(filtro),
    enabled: opcoes.enabled ?? true,
  });
}

export function useConteudosAdminPaginados(filtro: Omit<FiltroConteudos, "pagina"> = {}) {
  return useInfiniteQuery({
    queryKey: ["conteudos-admin", "paginado", filtro],
    queryFn: ({ pageParam }) => conteudoAdminService.listar({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
  });
}

export function useConteudoAdmin(id: string) {
  return useQuery({
    queryKey: ["conteudos-admin", "detalhe", id],
    queryFn: () => conteudoAdminService.buscar(id),
    enabled: !!id,
  });
}

function invalidarConteudos(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["conteudos-admin"] });
  queryClient.invalidateQueries({ queryKey: ["home"] });
}

export function useCriarConteudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConteudoAdminInput) => conteudoAdminService.criar(input),
    onSuccess: () => invalidarConteudos(queryClient),
  });
}

export function useAtualizarConteudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<ConteudoAdminInput> & { id: string }) =>
      conteudoAdminService.atualizar(id, input),
    onSuccess: () => invalidarConteudos(queryClient),
  });
}

/**
 * Envia a mídia do bloco e devolve a URL; em erro, rejeita com a mensagem pronta
 * para o formulário. O conteúdo só passa a usar o arquivo quando for salvo.
 */
export function useEnviarMidia(): (arquivo: File) => Promise<string> {
  const { mutateAsync } = useMutation({
    mutationFn: (arquivo: File) => conteudoAdminService.enviarMidia(arquivo),
  });
  return useCallback(
    async (arquivo: File) => {
      try {
        return (await mutateAsync(arquivo)).url;
      } catch (erro) {
        throw new Error(mensagemErroMidia(erro));
      }
    },
    [mutateAsync],
  );
}

/** Mensagem do erro ao enviar a mídia, a partir do que o back respondeu. */
export function mensagemErroMidia(erro: unknown): string {
  if (erro instanceof ApiError) {
    if (erro.status === 413) return "Arquivo grande demais. Envie um arquivo menor.";
    if (erro.status === 400) {
      try {
        const { motivo } = JSON.parse(erro.message) as { motivo?: unknown };
        if (typeof motivo === "string") return motivo;
      } catch {
        // sem corpo legível: cai na mensagem genérica
      }
    }
    if (erro.status === 403) return "Sua conta não tem permissão para enviar arquivos.";
  }
  return "Não foi possível enviar o arquivo. Confira sua conexão e tente de novo.";
}

export function useRemoverConteudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conteudoAdminService.remover(id),
    onSuccess: () => invalidarConteudos(queryClient),
  });
}

/**
 * O `detail` do 422 vem como texto quando a regra está no service (PATCH) e
 * como a lista do Pydantic quando está no schema (POST).
 */
function detalheDoErro(erro: ApiError): string | null {
  try {
    const { detail } = JSON.parse(erro.message) as { detail?: unknown };
    if (typeof detail === "string") return detail;
    const [primeiro] = Array.isArray(detail) ? (detail as { msg?: unknown }[]) : [];
    return typeof primeiro?.msg === "string" ? primeiro.msg.replace(/^Value error, /, "") : null;
  } catch {
    return null;
  }
}

/** Mensagem do erro ao salvar ou excluir, a partir do que o back respondeu. */
export function mensagemErroConteudo(erro: unknown, acao: "salvar" | "excluir" = "salvar"): string {
  if (erro instanceof ApiError) {
    if (erro.status === 404) return "Este conteúdo não existe mais. Volte para a lista.";
    if (erro.status === 403) return "Sua conta não tem permissão para alterar conteúdos.";
    if (erro.status === 400) {
      return "Um dos níveis escolhidos não existe mais. Recarregue a página e escolha de novo.";
    }
    if (erro.status === 422) {
      const detalhe = detalheDoErro(erro);
      return detalhe
        ? `O conteúdo não foi aceito: ${detalhe}.`
        : "O conteúdo não foi aceito. Confira os campos e tente de novo.";
    }
  }
  return `Não foi possível ${acao}. Confira sua conexão e tente de novo.`;
}
