import { execFileSync } from "node:child_process";

/** Consulta somente o Postgres descartável do COMPOSE_PROJECT_NAME atual. */
export function consultarBanco(sql: string): string {
  return execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "e2e/compose.yml",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "hality_e2e",
      "-d",
      "hality_e2e",
      "-At",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  ).trim();
}
