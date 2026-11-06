import { execFile } from "node:child_process";
import { setTimeout as esperar } from "node:timers/promises";
import { promisify } from "node:util";
import { z } from "zod";

const executar = promisify(execFile);
const linkSchema = z.url();
type Finalidade = "email_verification" | "invitation" | "password_reset";

/** Retorna o link mais recente para o destinatário e finalidade, sem registrar o token. */
export async function obterLinkEmail({
  destinatario,
  finalidade,
}: {
  destinatario: string;
  finalidade: Finalidade;
}): Promise<string> {
  const codigo = `import glob,json,os,sys
arquivos = sorted(glob.glob('/tmp/hality-e2e-emails/*.json'), key=os.path.getmtime, reverse=True)
for caminho in arquivos:
    with open(caminho) as arquivo:
        mensagem = json.load(arquivo)
    if mensagem['recipient'] == sys.argv[1] and mensagem['purpose'] == sys.argv[2]:
        print(json.dumps(mensagem['token_url']))
        break`;
  const limite = Date.now() + 30_000;
  do {
    const { stdout } = await executar("docker", [
      "compose",
      "-f",
      "e2e/compose.yml",
      "exec",
      "-T",
      "identity-worker",
      "python",
      "-c",
      codigo,
      destinatario,
      finalidade,
    ]);
    if (stdout.trim()) return linkSchema.parse(JSON.parse(stdout));
    await esperar(500);
  } while (Date.now() < limite);
  throw new Error("E-mail de teste não capturado dentro do prazo.");
}
