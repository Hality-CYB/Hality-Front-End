import { config } from "@/lib/config";

/**
 * Arquivos servidos pelo back (foto de diagnóstico, mídia de conteúdo) vêm
 * como caminho relativo (`/api/v1/...`). Em `<img>`/`<video>` esse caminho
 * resolveria contra o próprio front, então ganha a base da API. URL absoluta
 * (http/https) e `blob:` ficam como estão.
 */
export function urlDaApi(url: string): string {
  return /^(https?:|blob:)/.test(url) ? url : `${config.apiBaseUrl}${url}`;
}
