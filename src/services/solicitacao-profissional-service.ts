import { apiClient } from "@/lib/api-client";
import {
  listaSolicitacoesSchema,
  solicitacaoProfissionalSchema,
  type NovaSolicitacaoProfissional,
  type StatusSolicitacao,
} from "@/types/solicitacao-profissional";

const ADMIN_PATH = "/api/v1/admin/solicitacoes-profissionais";

export const solicitacaoProfissionalService = {
  async solicitar(dados: NovaSolicitacaoProfissional) {
    await apiClient.post("/api/v1/auth/profissionais/solicitacoes", dados);
  },
  async listar(status: StatusSolicitacao, pagina: number) {
    return listaSolicitacoesSchema.parse(
      await apiClient.get(`${ADMIN_PATH}?status=${status}&pagina=${pagina}`),
    );
  },
  async decidir(id: string, decisao: Exclude<StatusSolicitacao, "pendente">) {
    return solicitacaoProfissionalSchema.parse(
      await apiClient.post(`${ADMIN_PATH}/${id}/decisao`, { decisao }),
    );
  },
};
