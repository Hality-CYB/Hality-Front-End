"use client";

import { useState } from "react";
import { Check, FileText, Image as ImageIcon, Loader2, Upload, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { cn } from "@/lib/utils";
import { nivelColor } from "@/lib/level-format";
import { urlDaApi } from "@/lib/url-da-api";
import {
  CATEGORIAS_CONTEUDO,
  type CategoriaConteudo,
  type ConteudoAdmin,
  type ConteudoAdminInput,
} from "@/types/conteudo-admin";
import {
  blocoUnicoEditavel,
  DESTINOS_CONTEUDO,
  DESTINOS_EDITAVEIS,
  MIDIA_ACEITA,
  problemaDoArquivo,
  problemasDoConteudo,
  textosDoConteudo,
  type BlocoEditavel,
  type DestinoConteudo,
  type FormatoConteudo,
} from "@/types/conteudo";
import type { Classificacao } from "@/types/classificacao";

type ConteudoFormProps = {
  conteudo?: ConteudoAdmin;
  /** De `GET /classificacoes`, para escolher os níveis das orientações. */
  classificacoes?: Classificacao[];
  classificacoesComErro?: boolean;
  onTentarClassificacoesDeNovo?: () => void;
  /**
   * Envia o arquivo da imagem/vídeo e devolve a URL que vai no bloco. Em erro,
   * rejeita com a mensagem já pronta para mostrar.
   */
  onEnviarMidia: (arquivo: File) => Promise<string>;
  onSalvar: (input: ConteudoAdminInput) => void;
  salvando?: boolean;
  erro?: string | null;
};

const FORMATOS: { valor: FormatoConteudo; label: string; Icon: typeof FileText }[] = [
  { valor: "texto", label: "Texto", Icon: FileText },
  { valor: "imagem", label: "Imagem", Icon: ImageIcon },
  { valor: "video", label: "Vídeo", Icon: Video },
];

const classeLabel = "text-muted-foreground font-heading mb-1.5 block text-xs font-bold";
const classeCampo =
  "border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none";

/**
 * Formulário de conteúdo do admin; quem usa decide se cria ou atualiza. Salvar
 * publica: o produto não usa rascunho, e tirar do ar é excluir.
 */
export function ConteudoForm({
  conteudo,
  classificacoes,
  classificacoesComErro = false,
  onTentarClassificacoesDeNovo,
  onEnviarMidia,
  onSalvar,
  salvando = false,
  erro,
}: ConteudoFormProps) {
  const original = conteudo ? blocoUnicoEditavel(conteudo.blocos) : null;
  const [titulo, setTitulo] = useState(conteudo?.titulo ?? "");
  const [categoria, setCategoria] = useState<CategoriaConteudo | "">(conteudo?.categoria ?? "");
  // Conteúdo que o editor não monta (vários blocos ou outro tipo) fica como está
  // até o admin escolher um formato para substituí-lo.
  const [formato, setFormato] = useState<FormatoConteudo | null>(
    conteudo ? (original?.tipo ?? null) : "texto",
  );
  const [texto, setTexto] = useState(original?.tipo === "texto" ? original.texto : "");
  const [url, setUrl] = useState(original && original.tipo !== "texto" ? original.url : "");
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [erroMidia, setErroMidia] = useState<string | null>(null);

  function escolherFormato(valor: FormatoConteudo) {
    if (valor === formato) return;
    setFormato(valor);
    // Um arquivo de imagem não serve de vídeo (e vice-versa): volta ao original ou limpa.
    setUrl(original && original.tipo !== "texto" && original.tipo === valor ? original.url : "");
    setErroMidia(null);
  }

  async function enviarArquivo(arquivo: File | undefined) {
    if (!arquivo || (formato !== "imagem" && formato !== "video")) return;
    const problema = problemaDoArquivo(arquivo, formato);
    if (problema) {
      setErroMidia(problema);
      return;
    }
    setErroMidia(null);
    setEnviandoMidia(true);
    try {
      setUrl(await onEnviarMidia(arquivo));
    } catch (e) {
      setErroMidia(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setEnviandoMidia(false);
    }
  }
  const [descricao, setDescricao] = useState(
    original && original.tipo !== "texto" ? original.legenda : "",
  );
  const [destinos, setDestinos] = useState<DestinoConteudo[]>(conteudo?.destinos ?? []);
  const [classificacaoIds, setClassificacaoIds] = useState<number[]>(
    conteudo?.classificacaoIds ?? [],
  );
  const [ordem, setOrdem] = useState(conteudo?.ordem ?? 0);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const comOrientacoes = destinos.includes("orientacoes_diagnostico");
  // Níveis só valem nas orientações; fora delas o back não os usa.
  const idsEnviados = comOrientacoes ? classificacaoIds : [];

  const bloco: BlocoEditavel | null =
    formato === null
      ? null
      : formato === "texto"
        ? { tipo: "texto", texto }
        : formato === "imagem"
          ? {
              tipo: "imagem",
              url,
              legenda: descricao,
              ...(original?.tipo === "imagem" && original.alt ? { alt: original.alt } : {}),
            }
          : { tipo: "video", url, legenda: descricao };

  const problemas = [
    ...(titulo.trim() ? [] : ["Dê um título ao conteúdo."]),
    ...(categoria ? [] : ["Escolha a categoria."]),
    ...problemasDoConteudo({ bloco, destinos, classificacaoIds: idsEnviados }),
  ];

  function alternarDestino(destino: DestinoConteudo) {
    setDestinos((atuais) =>
      atuais.includes(destino) ? atuais.filter((d) => d !== destino) : [...atuais, destino],
    );
  }

  function alternarNivel(id: number) {
    setClassificacaoIds((atuais) =>
      atuais.includes(id) ? atuais.filter((n) => n !== id) : [...atuais, id],
    );
  }

  function salvar() {
    setTentouSalvar(true);
    if (problemas.length > 0 || categoria === "") return;
    onSalvar({
      titulo,
      categoria,
      blocos: bloco ? [bloco] : (conteudo?.blocos ?? []),
      destinos,
      classificacaoIds: idsEnviados,
      publicado: true,
      ordem,
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Card className="rounded-lg p-5 shadow-sm ring-0">
        <div className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="conteudo-titulo" className={classeLabel}>
              Título
            </label>
            <input
              id="conteudo-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do conteúdo"
              maxLength={255}
              className={classeCampo}
            />
          </div>
          <div>
            <label htmlFor="conteudo-categoria" className={classeLabel}>
              Categoria
            </label>
            <select
              id="conteudo-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaConteudo)}
              className={cn(classeCampo, "bg-card")}
            >
              <option value="">Selecionar categoria</option>
              {Object.entries(CATEGORIAS_CONTEUDO).map(([valor, label]) => (
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
                  onClick={() => escolherFormato(valor)}
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
          {formato === null && conteudo && (
            <Alert
              type="info"
              message={`Este conteúdo foi criado num formato que o editor não monta e vai ser mantido como está: ${
                textosDoConteudo({ itens: conteudo.blocos }).join(" ") || "sem texto"
              }. Escolha um formato acima só se quiser substituí-lo.`}
            />
          )}
          {formato === "texto" && (
            <div>
              <label htmlFor="conteudo-texto" className={classeLabel}>
                Texto
              </label>
              <textarea
                id="conteudo-texto"
                value={texto}
                rows={6}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreva o conteúdo"
                className={cn(classeCampo, "resize-y")}
              />
            </div>
          )}
          {(formato === "imagem" || formato === "video") && (
            <>
              <div>
                <span className={classeLabel}>{formato === "imagem" ? "Imagem" : "Vídeo"}</span>
                {/* O input fica escondido; o botão e a área vazia são <label> dele. */}
                <input
                  id="conteudo-arquivo"
                  type="file"
                  accept={MIDIA_ACEITA[formato].tipos.join(",")}
                  className="sr-only"
                  disabled={enviandoMidia}
                  onChange={(e) => {
                    void enviarArquivo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {url ? (
                  <div className="flex flex-col gap-2">
                    <div className="border-border overflow-hidden rounded-xl border bg-black/5">
                      {formato === "imagem" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arquivo servido pelo back (ou URL antiga), fora do next/image
                        <img
                          src={urlDaApi(url)}
                          alt="Prévia da imagem enviada"
                          className="block max-h-64 w-full object-contain"
                        />
                      ) : (
                        <video
                          src={urlDaApi(url)}
                          controls
                          aria-label="Prévia do vídeo enviado"
                          className="block max-h-64 w-full bg-black"
                        />
                      )}
                    </div>
                    <label
                      htmlFor="conteudo-arquivo"
                      className={cn(
                        "font-heading text-primary bg-secondary inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold",
                        enviandoMidia && "pointer-events-none opacity-60",
                      )}
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      {enviandoMidia ? "Enviando…" : "Trocar arquivo"}
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="conteudo-arquivo"
                    className={cn(
                      "border-border text-muted-foreground flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-dashed px-4 py-6 text-center",
                      enviandoMidia && "pointer-events-none opacity-60",
                    )}
                  >
                    {enviandoMidia ? (
                      <Loader2 className="text-primary h-5 w-5 animate-spin" aria-hidden />
                    ) : (
                      <Upload className="text-primary h-5 w-5" aria-hidden />
                    )}
                    <span className="font-heading text-primary text-sm font-bold">
                      {enviandoMidia
                        ? "Enviando…"
                        : formato === "imagem"
                          ? "Escolher imagem"
                          : "Escolher vídeo"}
                    </span>
                    <span className="text-xs">
                      {MIDIA_ACEITA[formato].nome}, até {MIDIA_ACEITA[formato].maxMb} MB
                    </span>
                  </label>
                )}
                {erroMidia && <Alert type="error" message={erroMidia} className="mt-2" />}
              </div>
              <div>
                <label htmlFor="conteudo-descricao" className={classeLabel}>
                  Descrição
                </label>
                <textarea
                  id="conteudo-descricao"
                  value={descricao}
                  rows={3}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={`Descreva ${formato === "imagem" ? "a imagem" : "o vídeo"}`}
                  className={cn(classeCampo, "resize-y")}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="rounded-lg p-5 shadow-sm ring-0">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="font-heading mb-1 text-sm font-bold">Onde aparece</legend>
          {DESTINOS_EDITAVEIS.map((destino) => {
            const id = `destino-${destino}`;
            return (
              <div key={destino} className="flex items-start gap-2.5">
                <input
                  id={id}
                  type="checkbox"
                  checked={destinos.includes(destino)}
                  onChange={() => alternarDestino(destino)}
                  aria-describedby={`${id}-ajuda`}
                  className="accent-primary mt-0.5 size-4 shrink-0"
                />
                <div className="flex-1">
                  <label htmlFor={id} className="font-heading text-sm font-bold">
                    {DESTINOS_CONTEUDO[destino].label}
                  </label>
                  <div id={`${id}-ajuda`} className="text-muted-foreground text-xs">
                    {DESTINOS_CONTEUDO[destino].descricao}
                  </div>
                </div>
              </div>
            );
          })}
        </fieldset>

        {comOrientacoes && (
          <fieldset className="mt-3.5 flex flex-col gap-2">
            <legend className="font-heading mb-1 text-xs font-bold">Níveis do diagnóstico</legend>
            {classificacoesComErro ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground flex-1">
                  Não foi possível carregar os níveis.
                </span>
                <Button size="sm" variant="secondary" onClick={onTentarClassificacoesDeNovo}>
                  Tentar de novo
                </Button>
              </div>
            ) : !classificacoes ? (
              <span className="text-muted-foreground text-xs">Carregando níveis…</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classificacoes.map((c) => {
                  const marcado = classificacaoIds.includes(c.id);
                  const cor = nivelColor(c.nivel);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="checkbox"
                      aria-checked={marcado}
                      onClick={() => alternarNivel(c.id)}
                      className="font-heading inline-flex items-center gap-1.5 rounded-4xl px-3.5 py-2 text-[13px] font-bold transition-colors"
                      style={
                        marcado
                          ? { background: cor, color: "#fff", border: `1.5px solid ${cor}` }
                          : { background: `${cor}14`, color: cor, border: `1.5px solid ${cor}40` }
                      }
                    >
                      {marcado ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <span
                          aria-hidden
                          className="size-2.5 rounded-full"
                          style={{ background: cor }}
                        />
                      )}
                      {c.nome}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}

        <div className="mt-3.5">
          <label htmlFor="conteudo-ordem" className={classeLabel}>
            Ordem de exibição
          </label>
          <input
            id="conteudo-ordem"
            type="number"
            min={0}
            value={ordem}
            onChange={(e) => setOrdem(Math.max(0, Number(e.target.value) || 0))}
            aria-describedby="conteudo-ordem-ajuda"
            className={classeCampo}
          />
          <span id="conteudo-ordem-ajuda" className="text-muted-foreground text-xs">
            Números menores aparecem primeiro em cada destino.
          </span>
        </div>
      </Card>

      {tentouSalvar && problemas.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-[rgba(255,59,48,0.15)] bg-[#FFF1F0] px-3.5 py-2.75 text-[13px] text-[#C0392B]"
        >
          <div className="font-heading mb-1 font-bold">Antes de salvar:</div>
          <ul className="list-disc pl-4">
            {problemas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {erro && <Alert type="error" message={erro} />}

      <Button variant="success" disabled={salvando || enviandoMidia} onClick={salvar}>
        <Check className="h-4 w-4" /> {conteudo ? "Salvar" : "Publicar"}
      </Button>
    </div>
  );
}
