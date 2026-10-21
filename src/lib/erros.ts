import { ApiError } from "@/lib/api-client";

/** 404 do back: o recurso não existe ou o usuário não tem acesso a ele (o back não diferencia). */
export function ehNaoEncontrado(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 404;
}
