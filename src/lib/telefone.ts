/**
 * Telefone brasileiro para exibição: "51999990001" vira "(51) 99999-0001".
 * O back guarda o que a pessoa digitou; aqui só se formata para ler. Número que
 * não tem cara de telefone brasileiro volta como veio.
 */
export function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return "";
  const limpo = valor.trim();
  // Código de outro país: não dá para saber o formato, então fica como foi digitado.
  if (limpo.startsWith("+") && !limpo.replace(/\s/g, "").startsWith("+55")) return limpo;
  let digitos = limpo.replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor.trim();
}
