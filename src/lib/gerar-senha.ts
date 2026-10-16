const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Senha inicial sugerida no cadastro feito pelo admin. Usa `crypto` e tem
 * tamanho fixo (10), acima do mínimo de 8 do back; sem caracteres ambíguos
 * (0/O, 1/l/I) porque o admin repassa a senha ao usuário.
 */
export function gerarSenhaTemporaria(tamanho = 10): string {
  const bytes = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}
