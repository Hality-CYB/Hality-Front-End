/**
 * Contatos oficiais da Hality, passados pelo time em 2026-11-13. Toda tela que
 * mostra contato usa este arquivo: nenhum número ou endereço fica escrito à mão
 * no componente.
 */

const WHATSAPP_NUMERO = "5551985718061";

export const CONTATOS_HALITY = {
  whatsapp: {
    exibicao: "(51) 98571-8061",
    numero: WHATSAPP_NUMERO,
  },
  email: "contato@hality.com.br",
  site: { exibicao: "hality.com.br", url: "https://www.hality.com.br" },
  redes: [
    { rede: "instagram", nome: "Instagram", url: "https://www.instagram.com/halitysaude" },
    { rede: "facebook", nome: "Facebook", url: "https://www.facebook.com/halitysaude" },
    {
      rede: "youtube",
      nome: "YouTube",
      url: "https://www.youtube.com/channel/UCZ5tQw1I-ZJ8q-ldLiWjocQ",
    },
  ],
} as const;

export type RedeHality = (typeof CONTATOS_HALITY.redes)[number]["rede"];

/** Link do WhatsApp com a mensagem já escrita (o usuário ainda pode editar antes de enviar). */
export function linkWhatsApp(mensagem?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMERO}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

/** `mailto:` com assunto opcional. */
export function linkEmail(assunto?: string): string {
  const base = `mailto:${CONTATOS_HALITY.email}`;
  return assunto ? `${base}?subject=${encodeURIComponent(assunto)}` : base;
}

export const MENSAGEM_PROFISSIONAL =
  "Olá! Sou profissional de saúde e quero usar o Check Your Breath com meus pacientes.";
export const ASSUNTO_PROFISSIONAL = "Quero usar o Check Your Breath";
