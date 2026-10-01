import type { BackendQuestionario } from "@/types/anamnese";

/**
 * Espelha o catálogo real do back (`app/services/anamnese_questionnaire.py`,
 * QUESTIONARIO_VIGENTE) — mesma versão, mesmos ids/enunciados/tipos. Usado
 * só pelo mock (MSW) de GET /anamneses/questionario, pra manter o dev com
 * mocking ligado o mais parecido possível do back real.
 */
export const ANAMNESE_QUESTIONARIO_MOCK: BackendQuestionario = {
  versao: "2026-08-v1",
  perguntas: [
    {
      id: "mau_halito_ao_acordar",
      enunciado: "Você sente mau hálito ao acordar?",
      tipo: "boolean",
      obrigatoria: true,
    },
    {
      id: "frequencia_escovacao",
      enunciado: "Com que frequência você escova os dentes?",
      tipo: "single_choice",
      obrigatoria: true,
      opcoes: ["1x ao dia", "2x ao dia", "3x ou mais"],
    },
    {
      id: "sintomas_adicionais",
      enunciado: "Descreva sintomas adicionais, se houver.",
      tipo: "text",
      obrigatoria: false,
    },
    {
      id: "avaliacao_propria_halito",
      enunciado: "Como você avalia o cheiro da sua respiração?",
      tipo: "scale",
      obrigatoria: true,
      escala_min: 1,
      escala_max: 5,
      escala_label_min: "Ruim",
      escala_label_max: "Excelente",
    },
  ],
};
