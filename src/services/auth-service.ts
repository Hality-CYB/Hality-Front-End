import {
  usuarioSchema,
  backendUserSchema,
  adaptBackendUser,
  type Usuario,
  type BackendUser,
} from "@/types/usuario";
import { ApiError, apiClient } from "@/lib/api-client";
import {
  identityTokenSchema,
  invitationConsentRequiredResponseSchema,
  passwordRecoveryResponseSchema,
  type IdentityConfirmation,
  type IdentityPurpose,
} from "@/types/auth";
import { config } from "@/lib/config";
import { setStoredToken, clearStoredToken } from "@/lib/session";
import { adicionarUsuarioMock, usuarioMockParaLogin } from "@/services/mocks/auth-handlers";
import {
  registrarDecisoesMock,
  validarDecisoesCadastroMock,
} from "@/services/mocks/consentimentos-handlers";
import type { DecisaoConsentimento } from "@/types/consentimento";

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

/** Sinaliza somente a resposta confirmada do backend, sem inferir o papel pelo token. */
export class ConsentimentoObrigatorioError extends ApiError {
  constructor() {
    super(422, "Para ativar sua conta, responda aos consentimentos abaixo.");
    this.name = "ConsentimentoObrigatorioError";
  }
}

/** Respostas de validação podem repetir o token; nenhum corpo de erro público chega à UI. */
function identityError(error: unknown, purpose?: IdentityPurpose): ApiError {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 422 && purpose === "invitation" && error instanceof ApiError) {
    try {
      if (invitationConsentRequiredResponseSchema.safeParse(JSON.parse(error.message)).success)
        return new ConsentimentoObrigatorioError();
    } catch {
      // Corpo malformado segue para a mensagem fixa de validação, sem expor o conteúdo.
    }
  }
  let message = "Não foi possível concluir a solicitação. Tente novamente.";
  if (error instanceof TypeError)
    message = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  if (status === 400 && purpose)
    message =
      "Este link é inválido ou não está mais disponível. Ele pode ter expirado, já ter sido utilizado ou ter sido revogado.";
  if (status === 409 && purpose === "invitation")
    message =
      "Os termos de consentimento foram atualizados. Leia a nova versão e decida novamente.";
  if (status === 422) message = "Confira os dados informados e tente novamente.";
  if (status === 422 && purpose === "invitation")
    message =
      "Confira a senha informada. A ativação pode exigir consentimentos; entre em contato com o responsável pelo cadastro para continuar.";
  if (status === 404 || status === 405)
    message = "Este serviço está temporariamente indisponível. Tente novamente mais tarde.";
  if (status === 429) message = "Muitas tentativas. Aguarde antes de tentar novamente.";
  return new ApiError(
    status,
    message,
    error instanceof ApiError ? error.retryAfterSeconds : undefined,
  );
}

export const authService = {
  async solicitarRecuperacao(email: string): Promise<void> {
    const result = usuarioSchema.shape.email.safeParse(email.trim());
    if (!result.success) throw new ApiError(422, "Informe um e-mail válido.");
    try {
      const data = await apiClient.post<unknown>(
        "/api/v1/auth/password-recovery",
        { email: result.data },
        { authenticated: false, expectedStatus: 202 },
      );
      passwordRecoveryResponseSchema.parse(data);
    } catch (error) {
      throw identityError(error);
    }
  },

  async confirmarIdentidade(purpose: IdentityPurpose, input: IdentityConfirmation): Promise<void> {
    if (!identityTokenSchema.safeParse(input.token).success)
      throw new ApiError(400, "Este link é inválido ou não está mais disponível.");
    if (input.senha.length < 8)
      throw new ApiError(422, "A senha deve ter pelo menos 8 caracteres.");
    const path = purpose === "invitation" ? "invitation" : "password-recovery";
    try {
      const payload = {
        token: input.token,
        senha: input.senha,
        ...(purpose === "invitation" && input.consentimentos
          ? { consentimentos: input.consentimentos }
          : {}),
      };
      await apiClient.post<void>(`/api/v1/auth/${path}/confirm`, payload, {
        authenticated: false,
        expectedStatus: 204,
      });
    } catch (error) {
      throw identityError(error, purpose);
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
