"use server";

import { redirect } from "next/navigation";
import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";
import { getSupabase } from "@/src/infrastructure/supabase/server";

type PasswordResetRow = { id: string; token_hash: string; user_id: string; expires_at: string };
type AccountUnlockRow = { id: string; token_hash: string; user_id: string; expires_at: string };
import {
  sendPasswordResetEmail,
  sendUnlockAccountEmail,
} from "@/app/lib/email";

const AUTH_CONFIG_ERROR =
  "Autenticação não configurada. Configure as variáveis do Supabase no .env.local.";

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (u) return u.startsWith("http") ? u : `https://${u}`;
  return "http://localhost:3000";
}

function getSupabaseOrRedirect(
  path: string,
  onErrorRedirect: (message: string) => never
) {
  try {
    return getSupabase();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (
      !msg ||
      msg.includes("Missing NEXT_PUBLIC_SUPABASE") ||
      msg.includes("SUPABASE")
    ) {
      onErrorRedirect(AUTH_CONFIG_ERROR);
    }
    throw e;
  }
}

const BCRYPT_ROUNDS = 10;
const TOKEN_EXPIRY_HOURS = 24;

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
  const supabase = getSupabaseOrRedirect("/auth/cadastro", (msg) =>
    redirect("/auth/cadastro?error=" + encodeURIComponent(msg))
  );

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    redirect(
      "/auth/cadastro?error=" +
        encodeURIComponent("Já existe uma conta com este email.")
    );
  }

  const password_hash = await hash(password, BCRYPT_ROUNDS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("users").insert({ email, password_hash } as any);
  if (error) {
    redirect(
      "/auth/cadastro?error=" + encodeURIComponent(error.message)
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
  const supabase = getSupabaseOrRedirect("/auth/recuperar-senha", (msg) =>
    redirect("/auth/recuperar-senha?error=" + encodeURIComponent(msg))
  );

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (user && typeof user === "object" && "id" in user) {
    const userId = (user as { id: string }).id;
    const rawToken = randomBytes(32).toString("hex");
    const token_hash = await hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
    const { data: row } = await supabase
      .from("password_reset_tokens")
      .insert({
        token_hash,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
      } as any)
      .select("id")
      .single();
    if (row && typeof row === "object" && "id" in row) {
      const rowId = (row as { id: string }).id;
      const resetLink = `${getBaseUrl()}/auth/reset-password?id=${rowId}&token=${rawToken}`;
      await sendPasswordResetEmail(email, resetLink);
    }
  }

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
    `${errorPath}?error=${encodeURIComponent(msg)}${id ? `&id=${id}` : ""}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  if (!id || !token) {
    redirect(errorQuery("Link inválido ou expirado. Solicite um novo."));
  }
  if (password.length < 6) {
    redirect(errorQuery("Senha deve ter no mínimo 6 caracteres."));
  }
  if (password !== confirm) {
    redirect(errorQuery("As senhas não coincidem."));
  }

  const supabase = getSupabaseOrRedirect(errorPath, (msg) =>
    redirect(errorQuery(msg))
  );

  const { data: row, error: fetchError } = await supabase
    .from("password_reset_tokens")
    .select("id, token_hash, user_id, expires_at")
    .eq("id", id)
    .single();

  if (fetchError || !row) {
    redirect(errorQuery("Link inválido ou expirado. Solicite um novo."));
  }
  const resetRow = row as PasswordResetRow;
  if (new Date(resetRow.expires_at) < new Date()) {
    redirect(errorQuery("Link expirado. Solicite um novo."));
  }
  const valid = await compare(token, resetRow.token_hash);
  if (!valid) {
    redirect(errorQuery("Link inválido ou expirado. Solicite um novo."));
  }

  const password_hash = await hash(password, BCRYPT_ROUNDS);
  await (supabase as any).from("users").update({ password_hash, updated_at: new Date().toISOString() }).eq("id", resetRow.user_id);
  await (supabase as any).from("password_reset_tokens").delete().eq("id", resetRow.id);

  redirect("/login?success=" + encodeURIComponent("Senha alterada com sucesso."));
}

export async function unlockAccountAction(formData: FormData) {
  const id = formData.get("id") as string | null;
  const token = formData.get("token") as string | null;
  const errorPath = "/auth/desbloquear-conta";
  const errorQuery = (msg: string) =>
    `${errorPath}?error=${encodeURIComponent(msg)}${id ? `&id=${id}` : ""}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  if (!id || !token) {
    redirect(errorQuery("Link inválido ou expirado. Solicite um novo pelo login."));
  }

  const supabase = getSupabaseOrRedirect(errorPath, (msg) =>
    redirect(errorQuery(msg))
  );

  const { data: row, error: fetchError } = await supabase
    .from("account_unlock_tokens")
    .select("id, token_hash, user_id, expires_at")
    .eq("id", id)
    .single();

  if (fetchError || !row) {
    redirect(errorQuery("Link inválido ou expirado."));
  }
  const unlockRow = row as AccountUnlockRow;
  if (new Date(unlockRow.expires_at) < new Date()) {
    redirect(errorQuery("Link expirado. Solicite um novo após tentar login."));
  }
  const valid = await compare(token, unlockRow.token_hash);
  if (!valid) {
    redirect(errorQuery("Link inválido ou expirado."));
  }

  await (supabase as any).from("users").update({
    failed_login_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  }).eq("id", unlockRow.user_id);
  await (supabase as any).from("account_unlock_tokens").delete().eq("id", unlockRow.id);

  redirect("/login?success=" + encodeURIComponent("Conta desbloqueada. Faça login."));
}
