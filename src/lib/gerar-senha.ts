/**
 * Gera uma senha temporária (só teatro de UI por enquanto — quando o
 * back-end existir, isso vira um evento "redefinir senha" que a API
 * processa e a senha real vem da resposta, não daqui).
 */
export function gerarSenhaTemporaria(): string {
  return Math.random().toString(36).slice(-8);
}
