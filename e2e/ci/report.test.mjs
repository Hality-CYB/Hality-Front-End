import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { describeReport, publishReport } from "./report.mjs";

const artifactUrl = "https://github.com/Hality-CYB/Hality-Front-End/actions/runs/123/artifacts/456";

function sampleReport(status = "expected") {
  return {
    stats: {
      expected: status === "expected" ? 1 : 0,
      unexpected: status === "unexpected" ? 1 : 0,
      flaky: 0,
      skipped: 0,
    },
    suites: [
      {
        title: "auth.spec.ts",
        specs: [],
        suites: [
          {
            title: "paciente",
            specs: [{ title: "login", tests: [{ projectName: "chromium", status }] }],
          },
        ],
      },
    ],
  };
}

async function fixture(
  t,
  { status = "expected", comments = [], fork = false, missing = false, apiError } = {},
) {
  const directory = await mkdtemp(join(tmpdir(), "hality-report-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reportFile = join(directory, "results.json");
  if (!missing) await writeFile(reportFile, JSON.stringify(sampleReport(status)));
  const output = { summary: "", writes: [], info: [], warnings: [] };
  const writeComment = (operation) => async (params) => {
    if (apiError) throw Object.assign(new Error("API error"), { status: apiError });
    output.writes.push({ operation, ...params });
  };
  const github = {
    paginate: async () => comments,
    rest: {
      issues: {
        listComments() {},
        createComment: writeComment("create"),
        updateComment: writeComment("update"),
      },
    },
  };
  const summary = {
    addRaw(body) {
      output.summary = body;
      return this;
    },
    async write() {},
  };
  const core = {
    summary,
    info: (text) => output.info.push(text),
    warning: (text) => output.warnings.push(text),
  };
  const context = {
    repo: { owner: "Hality-CYB", repo: "Hality-Front-End" },
    payload: {
      pull_request: {
        number: 47,
        head: { repo: { full_name: fork ? "contributor/fork" : "Hality-CYB/Hality-Front-End" } },
      },
    },
  };
  return {
    output,
    args: { github, context, core, artifactUrl, reportFile, jobFailed: status === "unexpected" },
  };
}

test("conta resultados e identifica testes aninhados que falharam", () => {
  assert.deepEqual(describeReport(sampleReport("unexpected")), {
    counts: { expected: 0, unexpected: 1, flaky: 0, skipped: 0 },
    failedTests: ["[chromium] auth.spec.ts > paciente > login"],
  });
  assert.throws(() => describeReport({ stats: { expected: -1 }, suites: [] }));
});

test("sucesso publica link e contagens no resumo, sem comentar", async (t) => {
  const { args, output } = await fixture(t);
  await publishReport(args);
  assert.ok(output.summary.includes(artifactUrl));
  assert.match(output.summary, /\| 1 \| 0 \| 0 \| 0 \|/);
  assert.deepEqual(output.writes, []);
});

test("falha cria comentário com link e nome do teste", async (t) => {
  const { args, output } = await fixture(t, { status: "unexpected" });
  await publishReport(args);
  assert.equal(output.writes.length, 1);
  assert.equal(output.writes[0].operation, "create");
  assert.ok(output.writes[0].body.includes(artifactUrl));
  assert.match(output.writes[0].body, /auth.spec.ts > paciente > login/);
});

test("nova falha atualiza o comentário único do bot", async (t) => {
  const comments = [
    { id: 1, user: { type: "User" }, body: "<!-- hality-e2e-report -->" },
    { id: 2, user: { type: "Bot" }, body: "<!-- hality-e2e-report -->\nResultado anterior" },
  ];
  const { args, output } = await fixture(t, { status: "unexpected", comments });
  await publishReport(args);
  assert.equal(output.writes.length, 1);
  assert.equal(output.writes[0].operation, "update");
  assert.equal(output.writes[0].comment_id, 2);
});

test("fork mantém resumo e pula comentário", async (t) => {
  const { args, output } = await fixture(t, { status: "unexpected", fork: true });
  await publishReport(args);
  assert.ok(output.summary.includes(artifactUrl));
  assert.deepEqual(output.writes, []);
  assert.equal(output.info.length, 1);
});

test("token sem escrita não quebra a publicação do resumo", async (t) => {
  const { args, output } = await fixture(t, { status: "unexpected", apiError: 403 });
  await publishReport(args);
  assert.ok(output.summary.includes(artifactUrl));
  assert.equal(output.info.length, 1);
});

test("erros inesperados da API não são ocultados", async (t) => {
  const { args } = await fixture(t, { status: "unexpected", apiError: 500 });
  await assert.rejects(publishReport(args), { status: 500 });
});

test("testes não executados produzem resumo explícito sem contagens inventadas", async (t) => {
  const { args, output } = await fixture(t, { missing: true });
  await publishReport({ ...args, artifactUrl: "" });
  assert.match(output.summary, /Relatório não gerado/);
  assert.match(output.summary, /Contagens indisponíveis/);
  assert.equal(output.warnings.length, 1);
});
