/**
 * Regra de senha nova, a mesma do back (`app/core/senha.py`): cadastro,
 * convite, redefinição e troca no perfil. O login não aplica a regra, então
 * senhas antigas continuam funcionando até a próxima troca.
 */

export const REQUISITOS_SENHA = [
  { id: "tamanho", texto: "8 caracteres ou mais", cumpre: (s: string) => s.length >= 8 },
  { id: "maiuscula", texto: "Uma letra maiúscula", cumpre: (s: string) => /\p{Lu}/u.test(s) },
  { id: "minuscula", texto: "Uma letra minúscula", cumpre: (s: string) => /\p{Ll}/u.test(s) },
  { id: "numero", texto: "Um número", cumpre: (s: string) => /\d/.test(s) },
] as const;

/** Recusadas pelo back mesmo cumprindo os requisitos. */
const SENHAS_PADRAO = new Set(["hality1234", "senha123", "12345678", "password", "admin123"]);

/** O que falta para a senha valer, em frase única para mensagens de erro. */
export function problemaDaSenha(senha: string): string | null {
  const faltando = REQUISITOS_SENHA.filter((r) => !r.cumpre(senha));
  if (faltando.length > 0) {
    return "A senha precisa de 8 caracteres ou mais, com letra maiúscula, minúscula e número.";
  }
  if (SENHAS_PADRAO.has(senha.trim().toLowerCase())) {
    return "Essa senha é comum demais. Escolha outra.";
  }
  return null;
}

export function senhaValida(senha: string): boolean {
  return problemaDaSenha(senha) === null;
}
