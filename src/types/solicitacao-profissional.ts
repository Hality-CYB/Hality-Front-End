import { z } from "zod";

export const statusSolicitacaoSchema = z.enum(["pendente", "aprovada", "recusada"]);
export type StatusSolicitacao = z.infer<typeof statusSolicitacaoSchema>;
export const solicitacaoProfissionalSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  telefone: z.string().nullable(),
  registro_profissional: z.string(),
  especialidade: z.string(),
  status: statusSolicitacaoSchema,
  created_at: z.string(),
  decidido_em: z.string().nullable(),
  usuario_id: z.string().nullable(),
});
export type SolicitacaoProfissional = z.infer<typeof solicitacaoProfissionalSchema>;
export const listaSolicitacoesSchema = z.object({
  itens: z.array(solicitacaoProfissionalSchema),
  total: z.number(),
  pagina: z.number(),
  total_paginas: z.number(),
});
export type NovaSolicitacaoProfissional = {
  nome: string;
  email: string;
  telefone?: string;
  registro_profissional: string;
  especialidade: string;
  aceita_termos: true;
};
