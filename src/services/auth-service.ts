import {
  usuarioSchema,
  backendUserSchema,
  adaptBackendUser,
  type Usuario,
  type BackendUser,
} from "@/types/usuario";
import { ApiError, apiClient } from "@/lib/api-client";
import {
  tokenDoLinkSchema,
  respostaRecuperacaoSchema,
  type DefinicaoDeSenha,
  type FinalidadeDoLink,
} from "@/types/auth";
import { config } from "@/lib/config";
import { problemaDaSenha } from "@/lib/senha";
import { setStoredToken, clearStoredToken } from "@/lib/session";
import { adicionarUsuarioMock, usuarioMockParaLogin } from "@/services/mocks/auth-handlers";
import {
  registrarDecisoesMock,
  validarDecisoesCadastroMock,
} from "@/services/mocks/consentimentos-handlers";
import type { DecisaoConsentimento } from "@/types/consentimento";
import {
  codigoTrocaGoogleSchema,
  respostaSessaoGoogleSchema,
  type TrocaCodigoGoogleInput,
} from "@/types/auth-google";

const CAMINHO_GOOGLE = "/api/v1/auth/google";

/**
 * Fala direto com o FastAPI (fastapi-users): sem BFF do Next no meio.
 *
 * access_token (JWT curto) vai em `localStorage`, anexado pelo api-client
 * em toda chamada autenticada. refresh_token NUNCA passa por aqui como
 * string manipulável — o back seta ele direto num cookie httpOnly na
 * resposta de login/registro (por isso `credentials: "include"` em toda
 * chamada de auth: sem isso o navegador nem recebe nem reenvia esse
 * cookie). JavaScript não tem como ler nem guardar o que nunca vê.
 */

/**
 * Prefixo do "access_token" mockado — não é um JWT de verdade, só
 * `mock-token:<usuarioId>`. `RoleLayout` decide se tem sessão olhando só
 * pra presença de um token (`hasActiveSession()`), então o login mockado
 * precisa gravar algo aqui também, senão fica preso como "deslogado"
 * mesmo depois de um login mockado bem-sucedido. O handler MSW de
 * `GET /api/v1/users/me` (auth-handlers.ts) decodifica esse mesmo prefixo.
 *
 * TODO: isso é um workaround pontual pro bug que achamos na revisão da
 * PR (login mockado nunca deixava a sessão "logada" pro RoleLayout).
 * Reavaliar quando o mock de auth for revisto/descontinuado — o ideal
 * seria o login mockado não precisar imitar formato de token nenhum.
 */
const MOCK_TOKEN_PREFIX = "mock-token:";

export type RegisterInput = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  /** "aaaa-mm-dd"; obrigatória no cadastro de paciente. */
  dataNascimento: string;
  /** Decisão explícita por finalidade, na versão do termo exibida (#160 do back). */
  consentimentos: DecisaoConsentimento[];
};

async function loginMock(email: string, senha: string): Promise<Usuario | null> {
  return usuarioMockParaLogin(email, senha);
}

async function registrarMock(input: RegisterInput): Promise<Usuario> {
  validarDecisoesCadastroMock(input.consentimentos);
  const usuario: Usuario = {
    id: `paciente-${crypto.randomUUID()}`,
    nome: input.nome,
    email: input.email,
    telefone: input.telefone,
    role: "paciente",
    criadoEm: new Date().toISOString(),
  };
  // Sem isso, GET /api/v1/users/me (chamado por RoleLayout logo após o
  // registro) não encontraria esse usuário — ele nunca existiu em
  // seedUsuarios, só nesse retorno aqui.
  adicionarUsuarioMock(usuario);
  registrarDecisoesMock(usuario.id, input.consentimentos);
  return usuario;
}

async function obterAccessToken(email: string, senha: string): Promise<string> {
  const formBody = new URLSearchParams();
  formBody.append("username", email.trim().toLowerCase());
  formBody.append("password", senha);

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });
  } catch {
    // Falha de rede (back fora do ar, CORS etc.) — sem isso, o erro cru do
    // fetch ("Failed to fetch") vaza direto pra tela de login.
    throw new ApiError(0, "Não foi possível conectar ao servidor.");
  }

  if (!response.ok) {
    throw new ApiError(response.status, "E-mail ou senha incorretos.");
  }

  const data: { access_token: string } = await response.json();
  return data.access_token;
}

async function buscarUsuarioAtual(accessToken: string): Promise<Usuario> {
  const response = await fetch(`${config.apiBaseUrl}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Falha ao obter perfil do usuário.");
  }

  return adaptBackendUser(backendUserSchema.parse(await response.json()));
}

async function loginReal(
  email: string,
  senha: string,
): Promise<{ usuario: Usuario; accessToken: string }> {
  const accessToken = await obterAccessToken(email, senha);
  const usuario = await buscarUsuarioAtual(accessToken);
  return { usuario, accessToken };
}

async function registrarReal(
  input: RegisterInput,
): Promise<{ usuario: Usuario; accessToken?: string }> {
  const payload = {
    name: input.nome,
    email: input.email.trim().toLowerCase(),
    password: input.senha,
    phone: input.telefone,
    data_nascimento: input.dataNascimento,
    consentimentos: input.consentimentos,
  };

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    if (errorBody?.detail === "REGISTER_USER_ALREADY_EXISTS") {
      throw new ApiError(response.status, "Este e-mail já está cadastrado.");
    }
    if (response.status === 409) {
      // Termo mudou de versão entre abrir a tela e enviar.
      throw new ApiError(
        409,
        "Os termos foram atualizados. Leia a versão nova e confirme de novo.",
      );
    }
    if (response.status === 422 && typeof errorBody?.detail === "string") {
      throw new ApiError(422, "Para criar a conta, aceite o tratamento dos seus dados de saúde.");
    }
    if (response.status === 422) {
      // Lista do Pydantic: no cadastro, o único campo que o front não valida igual é a senha.
      throw new ApiError(
        422,
        "A senha precisa de 8 caracteres ou mais, com letra maiúscula, minúscula e número.",
      );
    }
    throw new ApiError(response.status, "Não foi possível concluir o cadastro.");
  }

  const backendUser: BackendUser = await response.json();
  const usuario = adaptBackendUser(backendUser);

  // fastapi-users não loga automaticamente no registro — chama /auth/login
  // em seguida pra já sair com um access_token utilizável (e o cookie de
  // refresh setado). Se isso falhar (ex.: verificação de e-mail obrigatória
  // no futuro), segue só com o usuário criado; a pessoa loga manualmente.
  try {
    const accessToken = await obterAccessToken(input.email, input.senha);
    return { usuario, accessToken };
  } catch {
    return { usuario };
  }
}

/** O back pediu os consentimentos antes de ativar o convite (`CONSENTIMENTO_OBRIGATORIO`). */
export class ConsentimentoObrigatorioError extends ApiError {
  constructor() {
    super(422, "Para ativar sua conta, autorize o uso dos seus dados abaixo.");
    this.name = "ConsentimentoObrigatorioError";
  }
}

function detalheDoErro(erro: ApiError): unknown {
  try {
    return (JSON.parse(erro.message) as { detail?: unknown }).detail;
  } catch {
    return undefined;
  }
}

/**
 * Converte o erro dos fluxos por link (convite e recuperação) numa mensagem
 * fixa: o corpo do back pode repetir o token, então nunca chega à tela.
 */
function erroDoLink(erro: unknown, finalidade?: FinalidadeDoLink): ApiError {
  const status = erro instanceof ApiError ? erro.status : 0;
  if (
    status === 422 &&
    finalidade === "convite" &&
    erro instanceof ApiError &&
    detalheDoErro(erro) === "CONSENTIMENTO_OBRIGATORIO"
  ) {
    return new ConsentimentoObrigatorioError();
  }
  let mensagem = "Não foi possível concluir. Tente de novo.";
  if (erro instanceof TypeError) {
    mensagem = "Não foi possível conectar ao servidor. Confira sua conexão e tente de novo.";
  }
  if (status === 400 && finalidade) {
    mensagem =
      "Este link não vale mais. Ele pode ter expirado, já ter sido usado ou ter sido substituído por um novo.";
  }
  if (status === 409 && finalidade === "convite") {
    mensagem = "Os termos foram atualizados. Leia a versão nova e decida de novo.";
  }
  if (status === 422) {
    mensagem =
      "A senha não foi aceita. Ela precisa de 8 caracteres ou mais, com letra maiúscula, minúscula e número.";
  }
  if (status === 404 || status === 405) {
    mensagem = "Este serviço está indisponível agora. Tente de novo mais tarde.";
  }
  if (status === 429) mensagem = "Muitas tentativas. Aguarde um pouco e tente de novo.";
  return new ApiError(
    status,
    mensagem,
    erro instanceof ApiError ? erro.segundosParaTentarDeNovo : undefined,
  );
}

/** Nunca devolve o corpo bruto: ele pode conter o codigo temporario enviado. */
function erroDaTrocaGoogle(erro: unknown): ApiError {
  const status = erro instanceof ApiError ? erro.status : 0;
  const detalhe = erro instanceof ApiError ? detalheDoErro(erro) : undefined;
  let mensagem = "Não foi possível entrar com o Google. Tente novamente.";

  if (erro instanceof TypeError) {
    mensagem = "Não foi possível conectar ao servidor. Confira sua conexão e tente de novo.";
  }
  if (status === 400) {
    mensagem = "Este acesso com o Google expirou ou já foi utilizado. Comece novamente.";
  }
  if (status === 403) {
    mensagem =
      detalhe === "conta inativa"
        ? "Esta conta está inativa. Entre em contato com o suporte."
        : "O login com Google está disponível apenas para pacientes.";
  }
  if (status === 409) {
    mensagem =
      typeof detalhe === "string" && detalhe.startsWith("versão do termo desatualizada")
        ? "Os termos foram atualizados. Leia a versão nova e decida de novo."
        : "Já existe uma conta com este e-mail. Entre usando e-mail e senha.";
  }
  if (status === 422) {
    mensagem = "Revise as decisões sobre os termos antes de continuar.";
  }
  if (status === 429) mensagem = "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (status === 503) {
    mensagem = "O login com Google está indisponível agora. Tente de novo mais tarde.";
  }

  return new ApiError(
    status,
    mensagem,
    erro instanceof ApiError ? erro.segundosParaTentarDeNovo : undefined,
  );
}

export const authService = {
  /** Navegação completa para que o cookie OAuth acompanhe o fluxo pelo backend. */
  obterUrlDeAutorizacaoGoogle(): string {
    return `${config.apiBaseUrl}${CAMINHO_GOOGLE}/authorize`;
  },

  /** Adapta o login Google à mesma sessão e ao mesmo refresh usados pelo login atual. */
  async trocarCodigoGoogle(input: TrocaCodigoGoogleInput): Promise<void> {
    const codigo = codigoTrocaGoogleSchema.safeParse(input.codigo);
    if (!codigo.success) {
      throw new ApiError(400, "Este acesso com o Google não é válido. Comece novamente.");
    }

    try {
      const resposta = await apiClient.post<unknown>(
        `${CAMINHO_GOOGLE}/exchange`,
        {
          codigo: codigo.data,
          ...(input.consentimentos ? { consentimentos: input.consentimentos } : {}),
        },
        {
          autenticada: false,
          credentials: "include",
          statusEsperado: 200,
        },
      );
      const sessao = respostaSessaoGoogleSchema.parse(resposta);
      setStoredToken(sessao.access_token);
    } catch (erro) {
      throw erroDaTrocaGoogle(erro);
    }
  },

  async solicitarRecuperacao(email: string): Promise<void> {
    const resultado = usuarioSchema.shape.email.safeParse(email.trim());
    if (!resultado.success) throw new ApiError(422, "Informe um e-mail válido.");
    try {
      const data = await apiClient.post<unknown>(
        "/api/v1/auth/password-recovery",
        { email: resultado.data },
        { autenticada: false, statusEsperado: 202 },
      );
      respostaRecuperacaoSchema.parse(data);
    } catch (erro) {
      throw erroDoLink(erro);
    }
  },

  /** Define a senha pelo link do e-mail; no convite, envia também os consentimentos. */
  async definirSenhaPeloLink(finalidade: FinalidadeDoLink, input: DefinicaoDeSenha): Promise<void> {
    if (!tokenDoLinkSchema.safeParse(input.token).success) {
      throw new ApiError(400, "Este link não vale mais.");
    }
    const problema = problemaDaSenha(input.senha);
    if (problema) throw new ApiError(422, problema);
    const caminho = finalidade === "convite" ? "invitation" : "password-recovery";
    try {
      const payload = {
        token: input.token,
        senha: input.senha,
        ...(finalidade === "convite" && input.consentimentos
          ? { consentimentos: input.consentimentos }
          : {}),
      };
      await apiClient.post<void>(`/api/v1/auth/${caminho}/confirm`, payload, {
        autenticada: false,
        statusEsperado: 204,
      });
    } catch (erro) {
      throw erroDoLink(erro, finalidade);
    }
  },

  async login(email: string, senha: string): Promise<Usuario> {
    if (config.apiMocking) {
      const usuario = await loginMock(email, senha);
      if (!usuario) throw new ApiError(401, "E-mail ou senha incorretos.");
      setStoredToken(`${MOCK_TOKEN_PREFIX}${usuario.id}`);
      return usuarioSchema.parse(usuario);
    }

    const { usuario, accessToken } = await loginReal(email, senha);
    setStoredToken(accessToken);
    return usuarioSchema.parse(usuario);
  },

  async registrar(input: RegisterInput): Promise<Usuario> {
    if (config.apiMocking) {
      const usuario = await registrarMock(input);
      setStoredToken(`${MOCK_TOKEN_PREFIX}${usuario.id}`);
      return usuarioSchema.parse(usuario);
    }

    const { usuario, accessToken } = await registrarReal(input);
    if (accessToken) setStoredToken(accessToken);
    return usuarioSchema.parse(usuario);
  },

  async logout(): Promise<void> {
    if (!config.apiMocking) {
      try {
        // Encerra a sessão de verdade no back (apaga o refresh_token do
        // banco e o cookie) — o cookie viaja sozinho via credentials:
        // "include", não tem nada pra esse código ler ou mandar à mão. Se
        // isso falhar (back fora do ar), limpa local mesmo assim.
        await fetch(`${config.apiBaseUrl}/api/v1/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Sem back, sem problema — segue só limpando local.
      }
    }
    clearStoredToken();
  },
};
