import { z } from "zod";
import { diagnosticoNivelSchema } from "@/types/diagnostico";

/**
 * Mesma forma que Design/'s shared/tips.ts (Tip), renomeada pra
 * convenção do projeto. Lá ficava desconectada em runtime: Admin editava
 * sua própria cópia (useState local) enquanto Paciente/Profissional liam
 * a constante congelada do módulo — uma edição do admin nunca chegava
 * aos outros papéis, nem na mesma sessão. Aqui os 3 papéis passam a ler
 * pela mesma chave do TanStack Query (useDicas), então a mutação de
 * publicar/editar invalida o cache e todo mundo revalida.
 */

export const formatoDicaSchema = z.enum(["texto", "imagem", "video"]);
export type FormatoDica = z.infer<typeof formatoDicaSchema>;

export const dicaSchema = z.object({
  id: z.string(),
  titulo: z.string().min(1),
  categoria: z.string(),
  formato: formatoDicaSchema,
  corpo: z.string(),
  midiaUrl: z.string().optional(),
  niveis: z.array(diagnosticoNivelSchema),
  mostrarNaHome: z.boolean(),
  publicado: z.boolean(),
  ordem: z.number(),
  criadoEm: z.iso.datetime(),
  visualizacoes: z.number(),
});
export type Dica = z.infer<typeof dicaSchema>;
