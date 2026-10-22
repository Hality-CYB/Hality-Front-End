import { apiClient } from "@/lib/api-client";
import {
  adaptBackendConsentimentos,
  adaptBackendTermos,
  backendConsentimentosSchema,
  backendTermosSchema,
  type DecisaoConsentimento,
  type EstadoConsentimento,
  type TermoConsentimento,
} from "@/types/consentimento";

export const consentimentoService = {
  /** Público: usado no cadastro, antes de existir conta. */
  async listarTermos(): Promise<TermoConsentimento[]> {
    const data = await apiClient.get<unknown>("/api/v1/consentimentos/termos", {
      autenticada: false,
    });
    return adaptBackendTermos(backendTermosSchema.parse(data));
  },

  async meus(): Promise<EstadoConsentimento[]> {
    const data = await apiClient.get<unknown>("/api/v1/users/me/consentimentos");
    return adaptBackendConsentimentos(backendConsentimentosSchema.parse(data));
  },

  /**
   * Aceite ou revogação do próprio titular (o back guarda o histórico, não
   * sobrescreve). 409 quando a versão enviada não é mais a vigente do termo.
   */
  async decidir(decisao: DecisaoConsentimento): Promise<EstadoConsentimento[]> {
    const data = await apiClient.post<unknown>("/api/v1/users/me/consentimentos", decisao);
    return adaptBackendConsentimentos(backendConsentimentosSchema.parse(data));
  },
};
