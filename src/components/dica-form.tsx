"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCriarDica, useAtualizarDica } from "@/hooks/use-dicas";
import type { Dica, FormatoDica } from "@/types/dica";
import type { DiagnosticoNivel } from "@/types/diagnostico";

type DicaFormProps = {
  dica?: Dica;
};

const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

export function DicaForm({ dica }: DicaFormProps) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(dica?.titulo ?? "");
  const [categoria, setCategoria] = useState(dica?.categoria ?? "");
  const [corpo, setCorpo] = useState(dica?.corpo ?? "");
  const [formato, setFormato] = useState<FormatoDica>(dica?.formato ?? "texto");
  const [niveis, setNiveis] = useState<DiagnosticoNivel[]>(dica?.niveis ?? []);
  const [mostrarNaHome, setMostrarNaHome] = useState(dica?.mostrarNaHome ?? false);
  const [publicado, setPublicado] = useState(dica?.publicado ?? false);
  const [ordem, setOrdem] = useState(dica?.ordem ?? 1);

  const criar = useCriarDica();
  const atualizar = useAtualizarDica();
  const salvando = criar.isPending || atualizar.isPending;

  function toggleNivel(n: DiagnosticoNivel) {
    setNiveis((atual) => (atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n]));
  }

  async function salvar() {
    const payload = { titulo, categoria, corpo, formato, niveis, mostrarNaHome, publicado, ordem };
    if (dica) {
      await atualizar.mutateAsync({ id: dica.id, ...payload });
    } else {
      await criar.mutateAsync(payload);
    }
    router.push("/admin/dicas");
  }

  return (
    <Card className="rounded-lg p-5 shadow-sm ring-0">
      <div className="flex flex-col gap-3.5">
        <div>
          <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
            Título
          </label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título da dica"
          />
        </div>
        <div>
          <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
            Categoria
          </label>
          <Input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ex.: Higiene"
          />
        </div>
        <div>
          <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
            Corpo
          </label>
          <Textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={4} />
        </div>
        <div>
          <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
            Formato
          </label>
          <Select value={formato} onValueChange={(v) => setFormato(v as FormatoDica)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="texto">Texto</SelectItem>
              <SelectItem value="imagem">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
            Níveis
          </label>
          <div className="flex gap-4">
            {NIVEIS.map((n) => (
              <label key={n} className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={niveis.includes(n)} onCheckedChange={() => toggleNivel(n)} />
                Nível {n}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
            Ordem
          </label>
          <Input
            type="number"
            value={ordem}
            onChange={(e) => setOrdem(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <Checkbox checked={mostrarNaHome} onCheckedChange={(v) => setMostrarNaHome(!!v)} />
          Mostrar na home
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <Checkbox checked={publicado} onCheckedChange={(v) => setPublicado(!!v)} />
          Publicado
        </label>
        <Button size="lg" disabled={!titulo.trim() || salvando} onClick={salvar}>
          <Check className="h-4 w-4" /> {dica ? "Salvar alterações" : "Criar dica"}
        </Button>
      </div>
    </Card>
  );
}
