import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Rotas que não existem no back e já saíram do front (TASK-209). Se alguma
 * voltar em `src/`, este teste falha na CI. Os equivalentes reais:
 * - `/api/v1/usuarios` → `/api/v1/admin/usuarios`
 * - `/api/v1/dicas` → `/api/v1/admin/conteudos`
 * - `/pacientes/{id}/vincular-profissional` → `/api/v1/admin/vinculos`
 * - `/api/v1/profissionais` → `/api/v1/admin/usuarios?role=profissional`
 * - `/admin/validacao` (link antigo do menu) → `/admin/diagnosticos`
 */
const ROTAS_LEGADAS: { nome: string; padrao: RegExp }[] = [
  { nome: "/api/v1/usuarios", padrao: /["'`]\/api\/v1\/usuarios/ },
  { nome: "/api/v1/dicas", padrao: /["'`]\/api\/v1\/dicas/ },
  { nome: "vincular-profissional (rota)", padrao: /\/vincular-profissional["'`/]/ },
  { nome: "/api/v1/profissionais", padrao: /["'`]\/api\/v1\/profissionais/ },
  { nome: "/admin/validacao", padrao: /["'`]\/admin\/validacao/ },
];

const RAIZ = path.resolve(import.meta.dirname);
const ESTE_ARQUIVO = path.resolve(import.meta.filename);

function arquivosDoCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosDoCodigo(caminho);
    return /\.(ts|tsx)$/.test(nome) && caminho !== ESTE_ARQUIVO ? [caminho] : [];
  });
}

describe("rotas legadas", () => {
  const arquivos = arquivosDoCodigo(RAIZ);

  it.each(ROTAS_LEGADAS)("nenhum arquivo chama $nome", ({ padrao }) => {
    const ocorrencias = arquivos
      .filter((arquivo) => padrao.test(readFileSync(arquivo, "utf8")))
      .map((arquivo) => path.relative(RAIZ, arquivo));
    expect(ocorrencias).toEqual([]);
  });

  it("varre o código de verdade", () => {
    expect(arquivos.length).toBeGreaterThan(50);
  });
});
