"use client";

import { useState } from "react";
import { Check, FileText, Image as ImageIcon, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_DICA,
  type CategoriaDica,
  type Dica,
  type DicaInput,
  type FormatoDica,
} from "@/types/dica";

type DicaFormProps = {
  dica?: Dica;
  /** Recebe só o que deve ir ao back; na edição o corpo só vai se o formato for editável. */
  onSalvar: (input: Partial<DicaInput>) => void;
  salvando?: boolean;
  erro?: string | null;
};

const FORMATOS: { valor: Exclude<FormatoDica, "outro">; label: string; Icon: typeof FileText }[] = [
  { valor: "texto", label: "Texto", Icon: FileText },
  { valor: "imagem", label: "Imagem", Icon: ImageIcon },
  { valor: "video", label: "Vídeo", Icon: Video },
];

const classeLabel = "text-muted-foreground font-heading mb-1.5 block text-xs font-bold";
const classeCampo =
  "border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none";

/** Formulário de conteúdo do admin; quem usa decide se cria ou atualiza. */
export function DicaForm({ dica, onSalvar, salvando = false, erro }: DicaFormProps) {
  const [titulo, setTitulo] = useState(dica?.titulo ?? "");
  const [categoria, setCategoria] = useState<CategoriaDica | "">(dica?.categoria ?? "");
  const [formato, setFormato] = useState<FormatoDica>(dica?.formato ?? "texto");
  const [corpo, setCorpo] = useState(dica?.corpo ?? "");
  const [midiaUrl, setMidiaUrl] = useState(dica?.midiaUrl ?? "");
  const [mostrarNaHome, setMostrarNaHome] = useState(dica?.mostrarNaHome ?? false);
  const [ordem, setOrdem] = useState(dica?.ordem ?? 0);

  const formatoEditavel = formato !== "outro";
  const podeSalvar =
    titulo.trim().length > 0 &&
    categoria !== "" &&
    (!formatoEditavel || corpo.trim().length > 0) &&
    !salvando;

  function salvar(publicado: boolean) {
    if (categoria === "") return;
    onSalvar({
      titulo,
      categoria,
      mostrarNaHome,
      publicado,
      ordem,
      ...(formatoEditavel ? { formato, corpo, midiaUrl } : {}),
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Card className="rounded-lg p-5 shadow-sm ring-0">
        <div className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="dica-titulo" className={classeLabel}>
              Título
            </label>
            <input
              id="dica-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da dica"
              className={classeCampo}
            />
          </div>
          <div>
            <label htmlFor="dica-categoria" className={classeLabel}>
              Categoria
            </label>
            <select
              id="dica-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaDica)}
              className={cn(classeCampo, "bg-card")}
            >
              <option value="">Selecionar categoria</option>
              {Object.entries(CATEGORIAS_DICA).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={classeLabel}>Formato do conteúdo</span>
            <div className="flex gap-2">
              {FORMATOS.map(({ valor, label, Icon }) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={formato === valor}
                  onClick={() => setFormato(valor)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 rounded-xl border-[1.5px] px-2 py-3",
                    formato === valor ? "border-primary bg-secondary" : "border-border bg-card",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5",
                      formato === valor ? "text-primary" : "text-gray-3",
                    )}
                  />
                  <span
                    className={cn(
                      "font-heading text-xs font-bold",
                      formato === valor ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {!formatoEditavel && (
            <Alert
              type="info"
              message="Este conteúdo usa blocos que o editor não monta (ex.: protocolo de tratamento). O corpo fica como está; escolha um formato acima só se quiser substituí-lo."
            />
          )}
          {(formato === "imagem" || formato === "video") && (
            <div>
              <label htmlFor="dica-midia" className={classeLabel}>
                Endereço {formato === "imagem" ? "da imagem" : "do vídeo"}
              </label>
              <input
                id="dica-midia"
                type="url"
                value={midiaUrl}
                onChange={(e) => setMidiaUrl(e.target.value)}
                placeholder="https://"
                className={classeCampo}
              />
            </div>
          )}
          <div>
            <label htmlFor="dica-corpo" className={classeLabel}>
              {formato === "texto" || formato === "outro" ? "Conteúdo" : "Legenda"}
            </label>
            <textarea
              id="dica-corpo"
              value={corpo}
              disabled={!formatoEditavel}
              onChange={(e) => setCorpo(e.target.value)}
              rows={formato === "texto" ? 6 : 3}
              placeholder={
                formato === "texto" ? "Escreva o conteúdo da dica" : "Descreva a imagem ou o vídeo"
              }
              className={cn(classeCampo, "resize-none disabled:opacity-60")}
            />
          </div>
          {/* TODO(backend): não há rota que liste as classificações (id ↔ nível), então
              não dá para escolher aqui em quais níveis a dica aparece. A edição preserva
              os `classificacao_ids` que o conteúdo já tem. */}
          <div className="bg-background rounded-xl px-3.5 py-3 text-xs">
            <span className="font-heading font-bold">Orientações por nível: </span>
            {dica && dica.classificacaoIds.length > 0
              ? `vinculada a ${dica.classificacaoIds.length} classificação(ões).`
              : "sem vínculo."}{" "}
            <span className="text-muted-foreground">
              A escolha dos níveis ainda não está disponível.
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-heading text-sm font-bold">Aparecer na home</div>
              <div className="text-muted-foreground text-xs">
                Mostrar essa dica na aba inicial do paciente
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mostrarNaHome}
              aria-label="Aparecer na home"
              onClick={() => setMostrarNaHome((v) => !v)}
              className={cn(
                "flex h-5.5 w-9.5 shrink-0 items-center rounded-full p-0.5 transition-colors",
                mostrarNaHome ? "bg-primary justify-end" : "justify-start bg-gray-300",
              )}
            >
              <div className="h-4.5 w-4.5 rounded-full bg-white shadow" />
            </button>
          </div>
          <div>
            <label htmlFor="dica-ordem" className={classeLabel}>
              Ordem de exibição
            </label>
            <input
              id="dica-ordem"
              type="number"
              min={0}
              value={ordem}
              onChange={(e) => setOrdem(Math.max(0, Number(e.target.value) || 0))}
              className={classeCampo}
            />
            <span className="text-muted-foreground text-xs">
              Números menores aparecem primeiro na home e nas orientações.
            </span>
          </div>
        </div>
      </Card>

      {erro && <Alert type="error" message={erro} />}

      <div className="flex gap-2.5">
        <Button
          variant="secondary"
          disabled={!podeSalvar}
          onClick={() => salvar(false)}
          className="flex-1"
        >
          Salvar rascunho
        </Button>
        <Button
          variant="success"
          disabled={!podeSalvar}
          onClick={() => salvar(true)}
          className="flex-1"
        >
          <Check className="h-4 w-4" /> Publicar
        </Button>
      </div>
    </div>
  );
}
