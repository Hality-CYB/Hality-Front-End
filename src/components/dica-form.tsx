"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Image as ImageIcon, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { useCriarDica, useAtualizarDica } from "@/hooks/use-dicas";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import { cn } from "@/lib/utils";
import type { Dica, FormatoDica } from "@/types/dica";
import type { DiagnosticoNivel } from "@/types/diagnostico";

type DicaFormProps = {
  dica?: Dica;
};

const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

const CATEGORIAS = [
  "Higiene",
  "Saúde",
  "Nutrição",
  "Rotina",
  "Estilo de Vida",
  "Dieta",
  "Tratamento",
];

const FORMATOS: { valor: FormatoDica; label: string; Icon: typeof FileText }[] = [
  { valor: "texto", label: "Texto", Icon: FileText },
  { valor: "imagem", label: "Imagem", Icon: ImageIcon },
  { valor: "video", label: "Vídeo", Icon: Video },
];

export function DicaForm({ dica }: DicaFormProps) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(dica?.titulo ?? "");
  const [categoria, setCategoria] = useState(dica?.categoria ?? "");
  const [corpo, setCorpo] = useState(dica?.corpo ?? "");
  const [formato, setFormato] = useState<FormatoDica>(dica?.formato ?? "texto");
  const [niveis, setNiveis] = useState<DiagnosticoNivel[]>(dica?.niveis ?? []);
  const [mostrarNaHome, setMostrarNaHome] = useState(dica?.mostrarNaHome ?? false);
  const [ordem, setOrdem] = useState(dica?.ordem ?? 1);
  const [salvo, setSalvo] = useState(false);

  const criar = useCriarDica();
  const atualizar = useAtualizarDica();
  const salvando = criar.isPending || atualizar.isPending;

  function toggleNivel(n: DiagnosticoNivel) {
    setNiveis((atual) => (atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n]));
  }

  async function salvar(publicado: boolean) {
    const payload = { titulo, categoria, corpo, formato, niveis, mostrarNaHome, publicado, ordem };
    if (dica) {
      await atualizar.mutateAsync({ id: dica.id, ...payload });
    } else {
      await criar.mutateAsync(payload);
    }
    setSalvo(true);
    router.push("/admin/dicas");
  }

  const podeSalvar = titulo.trim().length > 0 && !salvando;

  return (
    <div className="flex flex-col gap-3.5">
      <Card className="rounded-lg p-5 shadow-sm ring-0">
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Título
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da dica..."
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="border-border bg-card w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            >
              <option value="">Selecionar categoria...</option>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Formato do conteúdo
            </label>
            <div className="flex gap-2">
              {FORMATOS.map(({ valor, label, Icon }) => (
                <button
                  key={valor}
                  type="button"
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
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              {formato === "texto" ? "Conteúdo" : "Descrição / legenda"}
            </label>
            <textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={formato === "texto" ? 6 : 3}
              placeholder={
                formato === "texto"
                  ? "Escreva o conteúdo da dica aqui..."
                  : "Descreva a imagem ou vídeo..."
              }
              className="border-border w-full resize-none rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Aparece nas orientações de
            </label>
            <div className="flex gap-2">
              {NIVEIS.map((n) => {
                const cor = nivelColor(n);
                const ativo = niveis.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleNivel(n)}
                    className="font-heading flex-1 rounded-full border-[1.5px] px-2 py-2 text-center text-xs font-bold"
                    style={{
                      borderColor: ativo ? cor : "var(--border)",
                      background: ativo ? `${cor}18` : "#fff",
                      color: ativo ? cor : "var(--gray-text)",
                    }}
                  >
                    {nivelLabel(n)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-heading text-sm font-bold">Aparecer na home</div>
              <div className="text-muted-foreground text-xs">
                Mostrar essa dica na aba inicial do paciente
              </div>
            </div>
            <button
              type="button"
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
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Ordem de exibição
            </label>
            <input
              type="number"
              min={1}
              value={ordem}
              onChange={(e) => setOrdem(Number(e.target.value) || 1)}
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
            <span className="text-muted-foreground text-xs">
              Números menores aparecem primeiro na home e nas orientações.
            </span>
          </div>
        </div>
      </Card>

      {salvo && <Alert type="success" message="Dica salva com sucesso!" />}

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
