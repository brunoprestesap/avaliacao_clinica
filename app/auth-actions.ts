"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { getAuthService } from "@/src/infrastructure/auth-container";

const AUTH_CONFIG_ERROR = "Autenticação não configurada. Configure MONGODB_URI no .env.local.";
const BCRYPT_ROUNDS = 10;

/** Verifica se o erro é o redirect do Next.js (que deve ser re-lançado, não tratado). */
function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: string }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * Envolve a obtenção do AuthService + a chamada assíncrona que o usa.
 * Com Mongo, o erro de configuração ausente (MONGODB_URI) só é lançado dentro
 * de getDb(), chamado de forma assíncrona nos métodos do repositório — não mais
 * de forma síncrona em getAuthService() como acontecia com o Supabase. Por isso
 * o catch precisa envolver a chamada assíncrona também, não só a construção do serviço.
 */
async function withAuthConfigErrorHandling<T>(
  buildErrorRedirect: (message: string) => string,
  fn: (authService: ReturnType<typeof getAuthService>) => Promise<T>
): Promise<T> {
  try {
    const authService = getAuthService();
    return await fn(authService);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "";
    if (!msg || msg.includes("Missing MONGODB_URI")) {
      redirect(buildErrorRedirect(AUTH_CONFIG_ERROR));
    }
    throw e;
  }
}

export async function signupAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase() ?? "";
  const password = formData.get("password") as string ?? "";
  const confirm = formData.get("confirmPassword") as string ?? "";
  if (!email || !password) {
    redirect(
      "/auth/cadastro?error=" +
        encodeURIComponent("Email e senha são obrigatórios.")
    );
  }
  if (password.length < 6) {
    redirect(
      "/auth/cadastro?error=" +
        encodeURIComponent("Senha deve ter no mínimo 6 caracteres.")
    );
  }
  if (password !== confirm) {
    redirect(
      "/auth/cadastro?error=" + encodeURIComponent("As senhas não coincidem.")
    );
  }

  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await withAuthConfigErrorHandling(
    (msg) => "/auth/cadastro?error=" + encodeURIComponent(msg),
    (authService) => authService.registerUser({ email, passwordHash })
  );
  if (!result.success) {
    redirect(
      "/auth/cadastro?error=" +
        encodeURIComponent("Já existe uma conta com este email.")
    );
  }
  redirect(
    "/auth/cadastro?success=" +
      encodeURIComponent("Conta criada. Faça login para continuar.")
  );
}

export async function requestResetAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase() ?? "";
  if (!email) {
    redirect(
      "/auth/recuperar-senha?error=" + encodeURIComponent("Informe o email.")
    );
  }

  await withAuthConfigErrorHandling(
    (msg) => "/auth/recuperar-senha?error=" + encodeURIComponent(msg),
    (authService) => authService.requestPasswordReset({ email })
  );

  redirect(
    "/auth/recuperar-senha?success=" +
      encodeURIComponent(
        "Se o email existir na base, você receberá um link para redefinir a senha em até 24 horas."
      )
  );
}

export async function resetPasswordAction(formData: FormData) {
  const id = formData.get("id") as string | null;
  const token = formData.get("token") as string | null;
  const password = formData.get("password") as string ?? "";
  const confirm = formData.get("confirmPassword") as string ?? "";
  const errorPath = "/auth/reset-password";
  const errorQuery = (msg: string) =>
    `${errorPath}?error=${encodeURIComponent(msg)}${id ? `&id=${id}` : ""}${token ? `&token=${encodeURIComponent(token ?? "")}` : ""}`;

  if (!id || !token) {
    redirect(errorQuery("Link inválido ou expirado. Solicite um novo."));
  }
  if (password.length < 6) {
    redirect(errorQuery("Senha deve ter no mínimo 6 caracteres."));
  }
  if (password !== confirm) {
    redirect(errorQuery("As senhas não coincidem."));
  }

  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await withAuthConfigErrorHandling(
    (msg) => errorQuery(msg),
    (authService) =>
      authService.resetPassword({ tokenId: id, rawToken: token, passwordHash })
  );
  if (!result.success) {
    redirect(errorQuery(result.message));
  }
  redirect("/login?success=" + encodeURIComponent("Senha alterada com sucesso."));
}

export async function unlockAccountAction(formData: FormData) {
  const id = formData.get("id") as string | null;
  const token = formData.get("token") as string | null;
  const errorPath = "/auth/desbloquear-conta";
  const errorQuery = (msg: string) =>
    `${errorPath}?error=${encodeURIComponent(msg)}${id ? `&id=${id}` : ""}${token ? `&token=${encodeURIComponent(token ?? "")}` : ""}`;

  if (!id || !token) {
    redirect(errorQuery("Link inválido ou expirado. Solicite um novo pelo login."));
  }

  const result = await withAuthConfigErrorHandling(
    (msg) => errorQuery(msg),
    (authService) => authService.unlockAccount({ tokenId: id, rawToken: token })
  );
  if (!result.success) {
    redirect(errorQuery(result.message));
  }
  redirect("/login?success=" + encodeURIComponent("Conta desbloqueada. Faça login."));
}
