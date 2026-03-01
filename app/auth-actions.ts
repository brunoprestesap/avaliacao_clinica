"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server";

const AUTH_CONFIG_ERROR =
  "Autenticação não configurada. No .env.local adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (chave anon do projeto no Supabase Dashboard → Settings → API).";

async function getSupabaseOrRedirect(
  onErrorRedirect: (message: string) => never
): Promise<Awaited<ReturnType<typeof createServerSupabaseClient>>> {
  try {
    return await createServerSupabaseClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!msg || msg.includes("Missing NEXT_PUBLIC_SUPABASE") || msg.includes("ANON_KEY") || msg.includes("PUBLISHABLE")) {
      onErrorRedirect(AUTH_CONFIG_ERROR);
    }
    throw e;
  }
}

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (u) return u.startsWith("http") ? u : `https://${u}`;
  return "http://localhost:3000";
}

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = formData.get("password") as string ?? "";
  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email e senha são obrigatórios."));
  }
  const supabase = await getSupabaseOrRedirect((msg) =>
    redirect("/login?error=" + encodeURIComponent(msg))
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  redirect("/");
}

export async function signupAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = formData.get("password") as string ?? "";
  const confirm = formData.get("confirmPassword") as string ?? "";
  if (!email || !password) {
    redirect("/auth/cadastro?error=" + encodeURIComponent("Email e senha são obrigatórios."));
  }
  if (password !== confirm) {
    redirect("/auth/cadastro?error=" + encodeURIComponent("As senhas não coincidem."));
  }
  const supabase = await getSupabaseOrRedirect((msg) =>
    redirect("/auth/cadastro?error=" + encodeURIComponent(msg))
  );
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getBaseUrl()}/auth/callback` },
  });
  if (error) {
    redirect("/auth/cadastro?error=" + encodeURIComponent(error.message));
  }
  redirect("/auth/cadastro?success=" + encodeURIComponent("Verifique seu email para confirmar o cadastro."));
}

export async function requestResetAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? "";
  if (!email) {
    redirect("/auth/recuperar-senha?error=" + encodeURIComponent("Informe o email."));
  }
  const supabase = await getSupabaseOrRedirect((msg) =>
    redirect("/auth/recuperar-senha?error=" + encodeURIComponent(msg))
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getBaseUrl()}/auth/reset-password`,
  });
  if (error) {
    redirect("/auth/recuperar-senha?error=" + encodeURIComponent(error.message));
  }
  redirect("/auth/recuperar-senha?success=" + encodeURIComponent("Se o email existir, você receberá um link para redefinir a senha."));
}

export async function resetPasswordAction(formData: FormData) {
  const password = formData.get("password") as string ?? "";
  const confirm = formData.get("confirmPassword") as string ?? "";
  if (!password || password.length < 6) {
    redirect("/auth/reset-password?error=" + encodeURIComponent("Senha deve ter no mínimo 6 caracteres."));
  }
  if (password !== confirm) {
    redirect("/auth/reset-password?error=" + encodeURIComponent("As senhas não coincidem."));
  }
  const supabase = await getSupabaseOrRedirect((msg) =>
    redirect("/auth/reset-password?error=" + encodeURIComponent(msg))
  );
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/auth/reset-password?error=" + encodeURIComponent(error.message));
  }
  redirect("/?success=" + encodeURIComponent("Senha alterada com sucesso."));
}

export async function logoutAction() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Se o cliente não está configurado, só redireciona
  }
  redirect("/login");
}
