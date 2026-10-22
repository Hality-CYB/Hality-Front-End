"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import {
  consumirDestinoLoginGoogle,
  limparDestinoLoginGoogle,
} from "@/lib/google-login-destination";
import {
  lerRetornoGoogle,
  mensagemDoErroCallbackGoogle,
  removerParametrosDoRetornoGoogle,
  type RetornoGoogle,
} from "@/lib/google-auth-callback";
import { authService } from "@/services/auth-service";
import type { DecisaoConsentimento } from "@/types/consentimento";

export type EstadoAuthGoogle = {
  status: "carregando" | "sucesso" | "consentimento" | "cancelado" | "erro";
  mensagem: string;
  erro?: string;
};

const ESTADO_INICIAL: EstadoAuthGoogle = {
  status: "carregando",
  mensagem: "Estamos confirmando seu login com Google…",
};

function estadoSemTroca(retorno: RetornoGoogle): EstadoAuthGoogle | null {
  if (retorno.status === "consentimento") {
    return {
      status: "consentimento",
      mensagem: "Antes de criar sua conta, precisamos confirmar os termos de uso.",
    };
  }
  if (retorno.status === "erro") {
    return {
      status: retorno.erro === "cancelado" ? "cancelado" : "erro",
      mensagem: mensagemDoErroCallbackGoogle(retorno.erro),
    };
  }
  if (retorno.status === "ausente") {
    return { status: "erro", mensagem: "Este retorno do Google não possui um código de acesso." };
  }
  if (retorno.status === "invalido") {
    return { status: "erro", mensagem: "O retorno do Google não é válido. Comece novamente." };
  }
  return null;
}

/**
 * Consome o retorno uma vez, remove seus dados da URL e não coloca o código
 * nas variáveis/cache do React Query. O código permanece apenas em memória.
 */
export function useAuthGoogle() {
  const { replace, refresh } = useRouter();
  const queryClient = useQueryClient();
  const retornoRef = useRef<RetornoGoogle | null>(null);
  const codigoRef = useRef<string | null>(null);
  const consentimentosRef = useRef<DecisaoConsentimento[] | undefined>(undefined);
  const trocaRef = useRef<Promise<void> | null>(null);
  const [estado, setEstado] = useState<EstadoAuthGoogle>(ESTADO_INICIAL);

  const mutation = useMutation({
    mutationFn: async () => {
      const codigo = codigoRef.current;
      if (!codigo) throw new Error("O código do Google não está disponível.");
      await authService.trocarCodigoGoogle({
        codigo,
        consentimentos: consentimentosRef.current,
      });
    },
    retry: false,
    networkMode: "always",
    gcTime: 0,
  });
  const { mutateAsync } = mutation;

  useEffect(() => {
    let ativo = true;

    if (!retornoRef.current) {
      const url = new URL(window.location.href);
      retornoRef.current = lerRetornoGoogle(url);
      if (retornoRef.current.status === "sessao" || retornoRef.current.status === "consentimento") {
        codigoRef.current = retornoRef.current.codigo;
      }
      if (["code", "etapa", "erro"].some((parametro) => url.searchParams.has(parametro))) {
        window.history.replaceState(
          window.history.state,
          "",
          removerParametrosDoRetornoGoogle(url),
        );
      }
    }

    const retorno = retornoRef.current;
    const estadoImediato = estadoSemTroca(retorno);
    if (estadoImediato) {
      // No primeiro acesso, o destino precisa sobreviver enquanto a pessoa
      // lê e decide os consentimentos. Erros e cancelamentos encerram o fluxo.
      if (retorno.status !== "consentimento") limparDestinoLoginGoogle();
      queueMicrotask(() => {
        if (ativo) setEstado(estadoImediato);
      });
    } else {
      if (!trocaRef.current) trocaRef.current = mutateAsync();
      const troca = trocaRef.current;
      void troca
        .then(() => {
          if (!ativo) return;
          codigoRef.current = null;
          queryClient.removeQueries({ queryKey: ["currentUser"] });
          setEstado({ status: "sucesso", mensagem: "Login concluído. Redirecionando…" });
          replace(consumirDestinoLoginGoogle());
          refresh();
        })
        .catch((erro: unknown) => {
          if (!ativo) return;
          limparDestinoLoginGoogle();
          setEstado({
            status: "erro",
            mensagem:
              erro instanceof Error
                ? erro.message
                : "Não foi possível entrar com o Google. Tente novamente.",
          });
        });
    }

    function esquecerCodigo() {
      codigoRef.current = null;
      limparDestinoLoginGoogle();
    }
    window.addEventListener("pagehide", esquecerCodigo);
    return () => {
      ativo = false;
      window.removeEventListener("pagehide", esquecerCodigo);
    };
  }, [mutateAsync, queryClient, refresh, replace]);

  async function concluirPrimeiroAcesso(consentimentos: DecisaoConsentimento[]): Promise<void> {
    if (retornoRef.current?.status !== "consentimento" || !codigoRef.current) {
      throw new ApiError(400, "O código do Google não está disponível.");
    }
    if (trocaRef.current) return trocaRef.current;

    consentimentosRef.current = consentimentos;
    setEstado({
      status: "consentimento",
      mensagem: "Antes de criar sua conta, precisamos confirmar os termos de uso.",
    });
    const troca = mutateAsync();
    trocaRef.current = troca;

    try {
      await troca;
      codigoRef.current = null;
      queryClient.removeQueries({ queryKey: ["currentUser"] });
      setEstado({ status: "sucesso", mensagem: "Conta criada. Redirecionando…" });
      replace(consumirDestinoLoginGoogle());
      refresh();
    } catch (erro) {
      const mensagem =
        erro instanceof Error ? erro.message : "Não foi possível criar sua conta. Tente novamente.";
      if (erro instanceof ApiError && erro.status === 400) {
        codigoRef.current = null;
        limparDestinoLoginGoogle();
        setEstado({ status: "erro", mensagem });
      } else {
        setEstado({
          status: "consentimento",
          mensagem: "Antes de criar sua conta, precisamos confirmar os termos de uso.",
          erro: mensagem,
        });
      }
      throw erro;
    } finally {
      consentimentosRef.current = undefined;
      trocaRef.current = null;
    }
  }

  return {
    ...estado,
    enviando: mutation.isPending,
    concluirPrimeiroAcesso,
    lerCodigo: () => codigoRef.current,
    descartarCodigo: () => {
      codigoRef.current = null;
      consentimentosRef.current = undefined;
      limparDestinoLoginGoogle();
    },
  };
}
