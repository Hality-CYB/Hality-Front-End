/**
 * Configuração da aplicação lida a partir de variáveis de ambiente.
 * Equivalente ao `app/core/config.py` do backend (fonte única da verdade
 * para valores vindos do `.env`).
 */

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

export const config = {
  apiBaseUrl: getEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000"),
  apiMocking: getEnv("NEXT_PUBLIC_API_MOCKING", "enabled") === "enabled",
} as const;
