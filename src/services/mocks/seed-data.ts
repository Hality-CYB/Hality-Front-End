import type { Paciente } from "@/types/paciente";
import type { Profissional } from "@/types/profissional";
import type { Usuario } from "@/types/usuario";
import type { Diagnostico } from "@/types/diagnostico";
import type { BackendAnamneseDetail } from "@/types/anamnese";
import type { Dica } from "@/types/dica";

/**
 * Dados de mock pro MSW, adaptados dos arrays que existiam em Design/
 * (DIAGS/INITIAL_PATIENTS em ProfessionalApp.tsx, TIPS em shared/tips.ts)
 * reformatados pros tipos canônicos. Usados só quando
 * NEXT_PUBLIC_API_MOCKING=enabled — nunca chegam a produção real.
 */

const isoDate = (dataBR: string): string => {
  const [d, m, y] = dataBR.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d)).toISOString();
};

export const seedAdmin: Usuario = {
  id: "admin-1",
  nome: "Dr. Marcelo Saldanha",
  email: "admin@hality.com",
  role: "admin",
  criadoEm: isoDate("01/01/2026"),
};

export const seedProfissionais: Profissional[] = [
  {
    id: "profissional-1",
    nome: "Dra. Ana Beatriz Costa",
    email: "prof@hality.com",
    role: "profissional",
    registroProfissional: "CRO-SP 123456",
    especialidade: "Odontologia",
    criadoEm: isoDate("01/01/2026"),
  },
];

export const seedPacientes: Paciente[] = [
  {
    id: "paciente-1",
    nome: "Ana Paula Ferreira",
    email: "ana@email.com",
    role: "paciente",
    telefone: "(11) 99999-0001",
    profissionalVinculadoId: "profissional-1",
    consentimentoDadosSaude: { aceito: true, data: isoDate("12/08/2026") },
    consentimentoTreinamentoIA: { aceito: true, data: isoDate("12/08/2026") },
    criadoEm: isoDate("12/08/2026"),
  },
  {
    id: "paciente-2",
    nome: "Julia Costa",
    email: "julia@email.com",
    role: "paciente",
    telefone: "(11) 99999-0002",
    profissionalVinculadoId: "profissional-1",
    consentimentoDadosSaude: { aceito: true, data: isoDate("10/08/2026") },
    consentimentoTreinamentoIA: { aceito: false },
    criadoEm: isoDate("10/08/2026"),
  },
  {
    id: "paciente-3",
    nome: "Carlos Mendes",
    email: "carlos@email.com",
    role: "paciente",
    telefone: "(11) 99999-0003",
    profissionalVinculadoId: "profissional-1",
    consentimentoDadosSaude: { aceito: true, data: isoDate("08/08/2026") },
    consentimentoTreinamentoIA: { aceito: true, data: isoDate("08/08/2026") },
    criadoEm: isoDate("08/08/2026"),
  },
  {
    id: "paciente-4",
    nome: "Roberto Souza",
    email: "roberto@email.com",
    role: "paciente",
    telefone: "(11) 99999-0004",
    profissionalVinculadoId: "profissional-1",
    consentimentoDadosSaude: { aceito: true, data: isoDate("05/08/2026") },
    consentimentoTreinamentoIA: { aceito: true, data: isoDate("05/08/2026") },
    criadoEm: isoDate("05/08/2026"),
  },
  {
    id: "paciente-5",
    nome: "Fernanda Lima",
    email: "fernanda@email.com",
    role: "paciente",
    telefone: "(11) 99999-0005",
    consentimentoDadosSaude: { aceito: true, data: isoDate("01/08/2026") },
    consentimentoTreinamentoIA: { aceito: true, data: isoDate("01/08/2026") },
    criadoEm: isoDate("01/08/2026"),
  },
  {
    id: "paciente-6",
    nome: "Paciente Demo",
    email: "paciente@hality.com",
    role: "paciente",
    telefone: "(11) 99999-0006",
    profissionalVinculadoId: "profissional-1",
    consentimentoDadosSaude: { aceito: true, data: isoDate("01/08/2026") },
    consentimentoTreinamentoIA: { aceito: true, data: isoDate("01/08/2026") },
    criadoEm: isoDate("01/08/2026"),
  },
];

const respostaMock = (
  perguntaId: string,
  enunciado: string,
  tipo: BackendAnamneseDetail["respostas"][number]["tipo"],
  valor: boolean | string | number,
): BackendAnamneseDetail["respostas"][number] => ({
  pergunta_id: perguntaId,
  enunciado,
  tipo,
  valor,
});

export const seedAnamneses: BackendAnamneseDetail[] = [
  {
    id: 101,
    paciente_id: 1,
    data_preenchimento: isoDate("01/08/2026"),
    respostas: [
      respostaMock("mau_halito_ao_acordar", "Você sente mau hálito ao acordar?", "boolean", true),
      respostaMock(
        "frequencia_escovacao",
        "Com que frequência você escova os dentes?",
        "single_choice",
        "2x ao dia",
      ),
      respostaMock(
        "sintomas_adicionais",
        "Descreva sintomas adicionais, se houver.",
        "text",
        "Nenhum",
      ),
      respostaMock(
        "avaliacao_propria_halito",
        "Como você avalia o cheiro da sua respiração?",
        "scale",
        4,
      ),
    ],
  },
  {
    id: 102,
    paciente_id: 2,
    data_preenchimento: isoDate("02/08/2026"),
    respostas: [
      respostaMock("mau_halito_ao_acordar", "Você sente mau hálito ao acordar?", "boolean", true),
      respostaMock(
        "frequencia_escovacao",
        "Com que frequência você escova os dentes?",
        "single_choice",
        "1x ao dia",
      ),
      respostaMock(
        "sintomas_adicionais",
        "Descreva sintomas adicionais, se houver.",
        "text",
        "Sensação de boca seca",
      ),
      respostaMock(
        "avaliacao_propria_halito",
        "Como você avalia o cheiro da sua respiração?",
        "scale",
        2,
      ),
    ],
  },
  {
    id: 103,
    paciente_id: 3,
    data_preenchimento: isoDate("03/08/2026"),
    respostas: [
      respostaMock("mau_halito_ao_acordar", "Você sente mau hálito ao acordar?", "boolean", false),
      respostaMock(
        "frequencia_escovacao",
        "Com que frequência você escova os dentes?",
        "single_choice",
        "3x ou mais",
      ),
      respostaMock("sintomas_adicionais", "Descreva sintomas adicionais, se houver.", "text", ""),
      respostaMock(
        "avaliacao_propria_halito",
        "Como você avalia o cheiro da sua respiração?",
        "scale",
        5,
      ),
    ],
  },
  {
    id: 104,
    paciente_id: 4,
    data_preenchimento: isoDate("04/08/2026"),
    respostas: [
      respostaMock("mau_halito_ao_acordar", "Você sente mau hálito ao acordar?", "boolean", true),
      respostaMock(
        "frequencia_escovacao",
        "Com que frequência você escova os dentes?",
        "single_choice",
        "1x ao dia",
      ),
      respostaMock(
        "sintomas_adicionais",
        "Descreva sintomas adicionais, se houver.",
        "text",
        "Gengiva sensível",
      ),
      respostaMock(
        "avaliacao_propria_halito",
        "Como você avalia o cheiro da sua respiração?",
        "scale",
        2,
      ),
    ],
  },
  {
    id: 105,
    paciente_id: 5,
    data_preenchimento: isoDate("05/08/2026"),
    respostas: [
      respostaMock("mau_halito_ao_acordar", "Você sente mau hálito ao acordar?", "boolean", false),
      respostaMock(
        "frequencia_escovacao",
        "Com que frequência você escova os dentes?",
        "single_choice",
        "2x ao dia",
      ),
      respostaMock("sintomas_adicionais", "Descreva sintomas adicionais, se houver.", "text", ""),
      respostaMock(
        "avaliacao_propria_halito",
        "Como você avalia o cheiro da sua respiração?",
        "scale",
        4,
      ),
    ],
  },
];

export const seedDiagnosticos: Diagnostico[] = [
  {
    id: "diagnostico-101",
    pacienteId: "paciente-1",
    profissionalId: "profissional-1",
    nivel: 2,
    status: "aguardando_revisao",
    imagemUrl: "",
    anamneseId: "anamnese-101",
    modeloVersao: "mock-0.1.0",
    confiancaIA: 87,
    criadoEm: isoDate("12/08/2026"),
  },
  {
    id: "diagnostico-102",
    pacienteId: "paciente-2",
    profissionalId: "profissional-1",
    nivel: null,
    status: "processando",
    imagemUrl: "",
    anamneseId: "anamnese-102",
    modeloVersao: "mock-0.1.0",
    criadoEm: isoDate("10/08/2026"),
  },
  {
    id: "diagnostico-103",
    pacienteId: "paciente-3",
    profissionalId: "profissional-1",
    nivel: 1,
    status: "concluido",
    imagemUrl: "",
    anamneseId: "anamnese-103",
    modeloVersao: "mock-0.1.0",
    confiancaIA: 92,
    criadoEm: isoDate("08/08/2026"),
    revisadoPor: "profissional-1",
    revisadoEm: isoDate("09/08/2026"),
  },
  {
    id: "diagnostico-104",
    pacienteId: "paciente-4",
    profissionalId: "profissional-1",
    nivel: 3,
    status: "aguardando_revisao",
    imagemUrl: "",
    anamneseId: "anamnese-104",
    modeloVersao: "mock-0.1.0",
    confiancaIA: 79,
    criadoEm: isoDate("05/08/2026"),
  },
  {
    id: "diagnostico-105",
    pacienteId: "paciente-5",
    profissionalId: "profissional-1",
    nivel: 2,
    status: "concluido",
    imagemUrl: "",
    anamneseId: "anamnese-105",
    modeloVersao: "mock-0.1.0",
    confiancaIA: 85,
    criadoEm: isoDate("01/08/2026"),
    revisadoPor: "profissional-1",
    revisadoEm: isoDate("02/08/2026"),
  },
];

export const seedDicas: Dica[] = [
  {
    id: "dica-1",
    titulo: "Higiene da Língua",
    categoria: "Higiene",
    formato: "texto",
    corpo:
      "Use um limpador de língua pela manhã. A saburra lingual é a principal causa da halitose. Passe suavemente 3 a 5 vezes da parte posterior para a ponta.",
    niveis: [1, 2, 3],
    mostrarNaHome: true,
    publicado: true,
    ordem: 1,
    criadoEm: isoDate("10/08/2026"),
    visualizacoes: 1230,
  },
  {
    id: "dica-2",
    titulo: "Hidratação",
    categoria: "Saúde",
    formato: "texto",
    corpo:
      "Beba 2 litros de água por dia. A boca seca favorece o crescimento de bactérias anaeróbias que produzem compostos sulfurados, causadores do mau hálito.",
    niveis: [1, 2, 3],
    mostrarNaHome: true,
    publicado: true,
    ordem: 2,
    criadoEm: isoDate("08/08/2026"),
    visualizacoes: 874,
  },
  {
    id: "dica-3",
    titulo: "Alimentos Aliados",
    categoria: "Nutrição",
    formato: "texto",
    corpo:
      "Consuma maçã, cenoura, salsinha e iogurte natural. Esses alimentos ajudam a neutralizar os compostos causadores do mau hálito de forma natural.",
    niveis: [2, 3],
    mostrarNaHome: true,
    publicado: true,
    ordem: 3,
    criadoEm: isoDate("05/08/2026"),
    visualizacoes: 401,
  },
  {
    id: "dica-4",
    titulo: "Rotina de Higiene",
    categoria: "Rotina",
    formato: "video",
    corpo:
      "Vídeo demonstrativo: escove os dentes após cada refeição, use fio dental diariamente e enxaguante sem álcool para completar a limpeza bucal.",
    niveis: [1, 2, 3],
    mostrarNaHome: false,
    publicado: true,
    ordem: 4,
    criadoEm: isoDate("01/08/2026"),
    visualizacoes: 512,
  },
  {
    id: "dica-5",
    titulo: "Consulta Periódica",
    categoria: "Saúde",
    formato: "texto",
    corpo:
      "Visite seu dentista a cada 6 meses. Cáries e doença periodontal são causas frequentes de halitose que exigem tratamento profissional.",
    niveis: [2, 3],
    mostrarNaHome: false,
    publicado: true,
    ordem: 5,
    criadoEm: isoDate("28/07/2026"),
    visualizacoes: 340,
  },
  {
    id: "dica-6",
    titulo: "Evite Tabagismo",
    categoria: "Estilo de Vida",
    formato: "imagem",
    corpo:
      "O cigarro resseca a mucosa oral e deposita substâncias odoríferas nos tecidos. Parar de fumar melhora significativamente o hálito.",
    niveis: [3],
    mostrarNaHome: false,
    publicado: false,
    ordem: 6,
    criadoEm: isoDate("20/07/2026"),
    visualizacoes: 0,
  },
];

export const seedUsuarios: Usuario[] = [seedAdmin, ...seedProfissionais, ...seedPacientes];
