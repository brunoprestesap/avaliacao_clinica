import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/src/infrastructure/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const RESET_PASSWORD_PATH = "/auth/reset-password";
const RESET_ERROR_MSG = "Link inválido ou expirado. Solicite um novo.";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const origin = new URL(request.url).origin;

  if (!code) {
    if (next && next !== "/") {
      const isReset = next.startsWith(RESET_PASSWORD_PATH);
      if (isReset) {
        return NextResponse.redirect(
          `${origin}${RESET_PASSWORD_PATH}?error=${encodeURIComponent(RESET_ERROR_MSG)}`
        );
      }
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Código de confirmação não informado.")}`
    );
  }

  if (!url || !anonKey) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Configuração de autenticação ausente.")}`
    );
  }

  const cookieStore = await cookies();
  const cookiesToApply: Array<{ name: string; value: string; options?: object }> = [];

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options ?? {});
          } catch {
            // em Route Handler pode falhar; aplicamos no redirect
          }
          cookiesToApply.push({ name, value, options });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (next.startsWith(RESET_PASSWORD_PATH)) {
      return NextResponse.redirect(
        `${origin}${RESET_PASSWORD_PATH}?error=${encodeURIComponent(RESET_ERROR_MSG)}`
      );
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const redirectResponse = NextResponse.redirect(`${origin}${next}`);
  cookiesToApply.forEach(({ name, value, options }) =>
    redirectResponse.cookies.set(name, value, options as Record<string, unknown>)
  );
  return redirectResponse;
}
