"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { getAuthService } from "@/src/infrastructure/auth-container";

const AUTH_CONFIG_ERROR =
  "Autenticação não configurada. Configure as variáveis do Supabase no .env.local.";
const BCRYPT_ROUNDS = 10;

function getAuthServiceOrRedirect(buildErrorRedirect: (message: string) => string) {
  try {
    return getAuthService();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (
      !msg ||
      msg.includes("Missing NEXT_PUBLIC_SUPABASE") ||
      msg.includes("SUPABASE")
    ) {
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

  const authService = getAuthServiceOrRedirect(
    (msg) => "/auth/cadastro?error=" + encodeURIComponent(msg)
  );
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await authService.registerUser({ email, passwordHash });
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

  const authService = getAuthServiceOrRedirect(
    (msg) => "/auth/recuperar-senha?error=" + encodeURIComponent(msg)
  );
  await authService.requestPasswordReset({ email });

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

  const authService = getAuthServiceOrRedirect(
    (msg) => errorQuery(msg)
  );
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await authService.resetPassword({
    tokenId: id,
    rawToken: token,
    passwordHash,
  });
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

  const authService = getAuthServiceOrRedirect(
    (msg) => errorQuery(msg)
  );
  const result = await authService.unlockAccount({ tokenId: id, rawToken: token });
  if (!result.success) {
    redirect(errorQuery(result.message));
  }
  redirect("/login?success=" + encodeURIComponent("Conta desbloqueada. Faça login."));
}
