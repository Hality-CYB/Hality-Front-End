import type { PerguntaAnamnese } from "@/types/anamnese";

/**
 * PLACEHOLDER — RF09 exige reproduzir "o questionário clínico já validado
 * pela Hality (10 perguntas)", que não está em nenhum documento a que
 * temos acesso (nem em Documents/requisitos.txt, nem em Design/). As 5
 * perguntas abaixo são as mesmas que já existiam em Design/'s
 * PatientApp.tsx (ANAMNESE_QS) — servem pra desenvolver a UI, mas
 * precisam ser substituídas pelo questionário real assim que a Hality
 * fornecer. A forma (PerguntaAnamnese[]) não muda quando isso acontecer.
 */
export const ANAMNESE_QUESTIONS: PerguntaAnamnese[] = [
  { id: "percebe-mau-halito", texto: "Você percebe mau hálito?", tipo: "sim_nao" },
  {
    id: "frequencia-escovacao",
    texto: "Com que frequência escova os dentes?",
    tipo: "escolha",
    opcoes: ["1x ao dia", "2x ao dia", "3x ao dia", "Mais de 3x"],
  },
  { id: "fumante", texto: "Você é fumante?", tipo: "sim_nao" },
  {
    id: "medicacao",
    texto: "Você usa alguma medicação regularmente?",
    tipo: "texto",
  },
  {
    id: "higiene-bucal",
    texto: "Classifique sua higiene bucal de 1 a 5:",
    tipo: "escala",
  },
];
