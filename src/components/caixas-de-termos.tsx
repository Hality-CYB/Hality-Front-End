"use client";

import { useState, type ReactNode } from "react";
import {
  DocumentoLegalConteudo,
  TermoConsentimentoConteudo,
  TextoLegalDialog,
} from "@/components/texto-legal-dialog";
import { POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO } from "@/lib/documentos-legais";
import type { TermoConsentimento } from "@/types/consentimento";

/**
 * Caixas de aceite de termos com o nome do termo clicável, abrindo o texto num
 * pop-up. É o mesmo padrão no cadastro, no primeiro acesso por convite e na
 * privacidade do perfil.
 */

/** Frase de aceite de cada finalidade; o nome do termo, clicável, vem depois. */
const FRASE_DE_ACEITE: Record<string, string> = {
  health_data: "Autorizo o tratamento dos meus dados de saúde para o pré-diagnóstico, conforme o",
  image_training:
    "Autorizo o uso das fotos da minha língua para treinar a inteligência artificial, conforme o",
};

export type Leitura =
  { tipo: "uso" } | { tipo: "privacidade" } | { tipo: "consentimento"; termo: TermoConsentimento };

/** Estado do pop-up de leitura: `abrir` mostra um termo, `dialogo` vai no JSX da tela. */
export function useLeituraDeTermos(): { abrir: (leitura: Leitura) => void; dialogo: ReactNode } {
  const [lendo, setLendo] = useState<Leitura | null>(null);
  const documento =
    lendo?.tipo === "uso"
      ? TERMOS_DE_USO
      : lendo?.tipo === "privacidade"
        ? POLITICA_DE_PRIVACIDADE
        : null;
  const dialogo = (
    <TextoLegalDialog
      open={lendo !== null}
      onOpenChange={(aberto) => !aberto && setLendo(null)}
      titulo={documento?.titulo ?? (lendo?.tipo === "consentimento" ? lendo.termo.titulo : "")}
      subtitulo={
        lendo?.tipo === "consentimento"
          ? `Versão ${lendo.termo.versao.replace(/^v/, "")}${lendo.termo.obrigatorio ? "" : ", opcional"}`
          : documento
            ? `Última atualização: ${documento.atualizadoEm}`
            : undefined
      }
    >
      {documento && <DocumentoLegalConteudo documento={documento} />}
      {lendo?.tipo === "consentimento" && <TermoConsentimentoConteudo texto={lendo.termo.texto} />}
    </TextoLegalDialog>
  );
  return { abrir: setLendo, dialogo };
}

/** Link dentro do texto de um checkbox: abre o termo sem marcar a caixa. */
export function LinkDoTermo({ children, onAbrir }: { children: string; onAbrir: () => void }) {
  // <span> e não <button>: o botão não quebra no meio da frase. O preventDefault
  // impede o clique de chegar ao <label> e marcar a caixa.
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        onAbrir();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onAbrir();
      }}
      className="text-primary focus-visible:ring-ring/50 rounded-sm font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-3"
    >
      {children}
    </span>
  );
}

type CaixaProps = {
  marcada: boolean;
  onMudar: (marcada: boolean) => void;
  desabilitada?: boolean;
  children: ReactNode;
};

function Caixa({ marcada, onMudar, desabilitada, children }: CaixaProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={marcada}
        disabled={desabilitada}
        onChange={(e) => onMudar(e.target.checked)}
        className="accent-primary mt-0.75 h-4 w-4 shrink-0"
      />
      <span className="text-muted-foreground text-[13px] leading-normal">{children}</span>
    </label>
  );
}

export function CaixaTermosDeUso({
  onLer,
  ...caixa
}: Omit<CaixaProps, "children"> & { onLer: (leitura: Leitura) => void }) {
  return (
    <Caixa {...caixa}>
      Li e aceito os <LinkDoTermo onAbrir={() => onLer({ tipo: "uso" })}>Termos de Uso</LinkDoTermo>{" "}
      e a{" "}
      <LinkDoTermo onAbrir={() => onLer({ tipo: "privacidade" })}>
        Política de Privacidade
      </LinkDoTermo>
    </Caixa>
  );
}

export function CaixaDeConsentimento({
  termo,
  onLer,
  ...caixa
}: Omit<CaixaProps, "children"> & {
  termo: TermoConsentimento;
  onLer: (leitura: Leitura) => void;
}) {
  return (
    <Caixa {...caixa}>
      {FRASE_DE_ACEITE[termo.finalidade] ?? "Aceito o"}{" "}
      <LinkDoTermo onAbrir={() => onLer({ tipo: "consentimento", termo })}>
        {`termo de ${termo.titulo.toLowerCase()}`}
      </LinkDoTermo>
      {termo.obrigatorio ? "" : " (opcional)"}
    </Caixa>
  );
}
