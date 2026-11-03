import { readFile } from "node:fs/promises";
import { z } from "zod";

const suiteSchema = z.lazy(() =>
  z.object({
    title: z.string(),
    specs: z.array(
      z.object({
        title: z.string(),
        tests: z.array(
          z.object({
            projectName: z.string(),
            status: z.enum(["expected", "unexpected", "flaky", "skipped"]),
          }),
        ),
      }),
    ),
    suites: z.array(suiteSchema).optional(),
  }),
);

// Formato público do reporter JSON: https://playwright.dev/docs/test-reporters#json-reporter
const reportSchema = z.object({
  stats: z.object({
    expected: z.number().int().nonnegative(),
    unexpected: z.number().int().nonnegative(),
    flaky: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  }),
  suites: z.array(suiteSchema),
});

export function describeReport(data) {
  const report = reportSchema.parse(data);
  const failedTests = [];
  function visit(suite, parents) {
    const titles = [...parents, suite.title];
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        if (test.status === "unexpected") {
          failedTests.push(`[${test.projectName}] ${[...titles, spec.title].join(" > ")}`);
        }
      }
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  }
  for (const suite of report.suites) visit(suite, []);
  return { counts: report.stats, failedTests };
}

const COMMENT_MARKER = "<!-- hality-e2e-report -->";

export async function publishReport({ github, context, core, artifactUrl, reportFile, jobFailed }) {
  let report;
  try {
    report = describeReport(JSON.parse(await readFile(reportFile, "utf8")));
  } catch {
    core.warning("Relatório JSON indisponível: os testes podem não ter sido executados.");
  }

  const lines = [
    "## E2E Chromium",
    artifactUrl ? `[Baixar relatório Playwright](${artifactUrl})` : "Relatório não gerado.",
    "Baixe e extraia o artifact; abra com `npx playwright show-report <pasta>/playwright-report`.",
  ];
  if (report) {
    const { expected, unexpected, flaky, skipped } = report.counts;
    lines.push(
      "",
      "| Aprovados | Falharam | Instáveis | Ignorados |",
      "| --- | --- | --- | --- |",
      `| ${expected} | ${unexpected} | ${flaky} | ${skipped} |`,
    );
    if (report.failedTests.length) {
      lines.push("", "### Testes que falharam");
      for (const name of report.failedTests) {
        lines.push(`- \`${name.replaceAll("`", "'").replace(/[\r\n]/g, " ")}\``);
      }
    }
  } else {
    lines.push("", "Contagens indisponíveis. Consulte os logs do job.");
  }
  const body = lines.join("\n");
  await core.summary.addRaw(body).write();

  const pr = context.payload.pull_request;
  if (!jobFailed || !pr) return;
  if (pr.head.repo?.full_name !== `${context.repo.owner}/${context.repo.repo}`) {
    core.info("Comentário ignorado: PR de fork usa token sem permissão de escrita.");
    return;
  }
  try {
    const params = { ...context.repo, issue_number: pr.number };
    const comments = await github.paginate(github.rest.issues.listComments, {
      ...params,
      per_page: 100,
    });
    const existing = comments.find(
      (comment) => comment.user?.type === "Bot" && comment.body?.startsWith(COMMENT_MARKER),
    );
    const commentBody = `${COMMENT_MARKER}\n${body}`;
    if (existing) {
      await github.rest.issues.updateComment({
        ...context.repo,
        comment_id: existing.id,
        body: commentBody,
      });
    } else {
      await github.rest.issues.createComment({ ...params, body: commentBody });
    }
  } catch (error) {
    if (error.status !== 403 && error.status !== 404) throw error;
    core.info("Comentário ignorado: token sem permissão para escrever neste PR.");
  }
}
