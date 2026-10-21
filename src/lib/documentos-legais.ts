/**
 * Termos de Uso e Política de Privacidade mostrados no cadastro.
 *
 * RASCUNHO escrito pelo time a partir do que o app faz hoje (rotas, dados
 * guardados, sessão, papéis). Precisa da revisão do jurídico/Hality antes de ir
 * para produção, e os trechos entre colchetes precisam ser preenchidos. Os
 * termos de consentimento (dados de saúde e treino da IA) não estão aqui: eles
 * vêm versionados do back (`GET /consentimentos/termos`).
 *
 * Linha que começa com "- " vira item de lista.
 */

export type DocumentoLegal = {
  titulo: string;
  atualizadoEm: string;
  secoes: { titulo: string; linhas: string[] }[];
};

const CONTATO = "[e-mail do encarregado de dados]";

export const TERMOS_DE_USO: DocumentoLegal = {
  titulo: "Termos de Uso",
  atualizadoEm: "[data da publicação]",
  secoes: [
    {
      titulo: "1. Sobre o Check Your Breath",
      linhas: [
        "O Check Your Breath é um aplicativo da Hality Diagnóstico do Hálito ([razão social], CNPJ [número]) que faz uma triagem de halitose (mau hálito) a partir de uma foto da língua e de um questionário de saúde (anamnese).",
        "Ao criar uma conta ou usar o app, você concorda com estes Termos e com a Política de Privacidade.",
      ],
    },
    {
      titulo: "2. O resultado é um pré-diagnóstico",
      linhas: [
        "O resultado é gerado por inteligência artificial e serve como triagem. Ele não é um diagnóstico médico ou odontológico e não substitui a consulta com um profissional de saúde.",
        "Se o resultado for revisado por um profissional vinculado à sua conta, o app mostra a revisão. Na dúvida, ou se os sintomas persistirem, procure um dentista ou médico.",
      ],
    },
    {
      titulo: "3. Sua conta",
      linhas: [
        "- Use informações verdadeiras e mantenha seus dados atualizados.",
        "- Sua senha é pessoal. Não a compartilhe e avise a Hality se suspeitar de acesso indevido.",
        "- Para criar uma conta é preciso ter [idade mínima, a definir com o jurídico/Hality].",
        "- Pacientes cadastrados por um profissional de saúde e contas de profissionais criadas pela Hality recebem um convite por e-mail para definir a própria senha.",
      ],
    },
    {
      titulo: "4. Uso permitido",
      linhas: [
        "- Envie apenas fotos da sua própria língua. O profissional de saúde só pode enviar fotos de pacientes vinculados a ele e que tenham autorizado o tratamento dos dados.",
        "- Não tente acessar dados de outras pessoas, burlar a segurança ou usar o app de forma automatizada.",
        "- Não use o app para fins ilegais ou que prejudiquem outras pessoas.",
      ],
    },
    {
      titulo: "5. Profissionais de saúde",
      linhas: [
        "O profissional vinculado a um paciente pode ver os diagnósticos desse paciente, fazer avaliações em nome dele e revisar o resultado da inteligência artificial. A conduta clínica e a revisão são de responsabilidade do profissional, conforme as normas do seu conselho de classe.",
      ],
    },
    {
      titulo: "6. Conteúdos e orientações",
      linhas: [
        "As dicas e orientações do app são informativas e educativas. Elas não substituem o acompanhamento de um profissional.",
      ],
    },
    {
      titulo: "7. Disponibilidade e mudanças no app",
      linhas: [
        "A Hality trabalha para manter o app disponível, mas ele pode ficar fora do ar para manutenção ou por falhas técnicas. Funcionalidades podem mudar ou deixar de existir.",
      ],
    },
    {
      titulo: "8. Propriedade intelectual",
      linhas: [
        "A marca, o aplicativo, o modelo de inteligência artificial e os conteúdos pertencem à Hality ou a seus licenciantes. Os dados que você envia continuam sendo seus e são tratados conforme a Política de Privacidade.",
      ],
    },
    {
      titulo: "9. Suspensão e encerramento",
      linhas: [
        "Você pode pedir o encerramento da sua conta a qualquer momento pelo contato abaixo. A Hality pode suspender ou encerrar contas que descumpram estes Termos.",
      ],
    },
    {
      titulo: "10. Alterações destes Termos",
      linhas: [
        "Quando estes Termos mudarem, a nova versão será publicada no app, com a data de atualização. Mudanças importantes serão avisadas antes de valer.",
      ],
    },
    {
      titulo: "11. Lei aplicável e contato",
      linhas: [
        "Estes Termos seguem as leis brasileiras. Fica eleito o foro de [cidade/UF, a definir], ressalvado o direito do consumidor de ajuizar ação no seu domicílio.",
        `Dúvidas: ${CONTATO}.`,
      ],
    },
  ],
};

export const POLITICA_DE_PRIVACIDADE: DocumentoLegal = {
  titulo: "Política de Privacidade",
  atualizadoEm: "[data da publicação]",
  secoes: [
    {
      titulo: "1. Quem trata seus dados",
      linhas: [
        "A Hality Diagnóstico do Hálito ([razão social], CNPJ [número]) é a controladora dos dados tratados no Check Your Breath, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).",
        `Encarregado de dados (DPO): [nome], ${CONTATO}.`,
      ],
    },
    {
      titulo: "2. Quais dados coletamos",
      linhas: [
        "- Cadastro: nome, e-mail, telefone (opcional) e senha. A senha é guardada de forma irreversível (hash), nunca em texto.",
        "- Login com Google, se você usar: nome, e-mail e o identificador da sua conta Google.",
        "- Dados de saúde: respostas da anamnese, fotos da língua, resultado do pré-diagnóstico e revisões feitas por profissionais.",
        "- Profissionais de saúde: registro profissional e especialidade.",
        "- Consentimentos: quais você aceitou ou recusou, a versão do termo e a data.",
        "- Dados técnicos: registros de acesso (data, hora e endereço IP) e registros das ações administrativas.",
      ],
    },
    {
      titulo: "3. Para que usamos e com qual base legal",
      linhas: [
        "- Criar e manter sua conta e prestar o serviço: execução do contrato (LGPD, art. 7º, V).",
        "- Gerar o pré-diagnóstico, permitir a revisão pelo profissional vinculado e guardar seu histórico: seu consentimento específico para dados de saúde (art. 11, I).",
        "- Treinar e avaliar o modelo de inteligência artificial com suas fotos: só se você autorizar, e você pode revogar quando quiser (art. 11, I).",
        "- Enviar e-mails do serviço, como convite e recuperação de senha: execução do contrato (art. 7º, V).",
        "- Segurança, prevenção a fraudes e registros de acesso: cumprimento de obrigação legal (Marco Civil da Internet, art. 15) e legítimo interesse (art. 7º, II e IX).",
      ],
    },
    {
      titulo: "4. Com quem compartilhamos",
      linhas: [
        "- Profissionais de saúde vinculados à sua conta, que veem seus diagnósticos para revisá-los.",
        "- Fornecedores que operam o serviço em nome da Hality, como hospedagem em nuvem ([provedor]) e envio de e-mails ([provedor]), sob contrato e só para essa finalidade.",
        "- Google, se você entrar com a conta Google.",
        "- Autoridades públicas, quando a lei exigir.",
        "Não vendemos seus dados e não os usamos para publicidade.",
      ],
    },
    {
      titulo: "5. Onde os dados ficam",
      linhas: [
        "Os dados são armazenados em servidores de nuvem [região, a confirmar]. Se ficarem fora do Brasil, a transferência segue as regras do art. 33 da LGPD.",
      ],
    },
    {
      titulo: "6. Como protegemos",
      linhas: [
        "- Conexões criptografadas (HTTPS).",
        "- Senhas guardadas com hash.",
        "- Acesso por papel: cada pessoa vê só o que o seu papel permite, e o profissional só vê pacientes vinculados.",
        "- Fotos de diagnóstico acessadas por links temporários.",
        "- Registro das ações administrativas sensíveis.",
      ],
    },
    {
      titulo: "7. Por quanto tempo guardamos",
      linhas: [
        "- Dados da conta e de saúde: enquanto sua conta estiver ativa e, depois do encerramento, por [prazo, a definir com o jurídico/Hality].",
        "- Registros de acesso: no mínimo 6 meses, como exige o Marco Civil da Internet.",
        "- Registros de consentimento: enquanto forem necessários para comprovar o que você autorizou.",
      ],
    },
    {
      titulo: "8. Seus direitos",
      linhas: [
        "Pela LGPD (art. 18), você pode pedir a confirmação de que tratamos seus dados, o acesso a eles, a correção, a anonimização, o bloqueio ou a eliminação de dados desnecessários, a portabilidade, informações sobre compartilhamento e a revogação do consentimento.",
        `Os consentimentos podem ser revistos a qualquer momento em Perfil > Privacidade. Os demais pedidos podem ser feitos pelo ${CONTATO}. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
      ],
    },
    {
      titulo: "9. Sessão e armazenamento no seu dispositivo",
      linhas: [
        "Para manter você conectado, o app guarda no seu navegador um token de acesso e um cookie de sessão. Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.",
      ],
    },
    {
      titulo: "10. Crianças e adolescentes",
      linhas: [
        "[A definir com o jurídico/Hality: idade mínima de uso e, se o app atender menores de 18 anos, como o responsável legal dá o consentimento (LGPD, art. 14).]",
      ],
    },
    {
      titulo: "11. Alterações desta Política",
      linhas: [
        "Quando esta Política mudar, a nova versão será publicada no app, com a data de atualização. Se a mudança afetar o que você autorizou, pediremos sua decisão de novo.",
      ],
    },
  ],
};
