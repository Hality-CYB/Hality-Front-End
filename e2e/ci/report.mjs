import { appendFile, readFile } from "node:fs/promises";

const lines = [
  "## E2E Chromium",
  process.env.E2E_ARTIFACT_URL
    ? `[Baixar relatório Playwright](${process.env.E2E_ARTIFACT_URL})`
    : "Relatório não gerado.",
];
try {
  const { stats } = JSON.parse(await readFile("test-results/results.json", "utf8"));
  lines.push(
    "",
    "| Aprovados | Falharam | Instáveis | Ignorados |",
    "| --- | --- | --- | --- |",
    `| ${stats.expected} | ${stats.unexpected} | ${stats.flaky} | ${stats.skipped} |`,
  );
} catch {
  lines.push("Contagens indisponíveis. Consulte os logs do job.");
}
await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
