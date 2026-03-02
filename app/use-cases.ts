import type { AvaliacaoUseCases } from "@/src/application";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAvaliacaoUseCases } from "@/src/infrastructure/container";
import type { Database } from "@/src/infrastructure/supabase/database.types";
import { getSessionContext } from "@/app/auth";
import type { AuthUser } from "@/app/auth";

/**
 * Retorna use cases com cliente Supabase do request (sessão + userId nos repositórios).
 * Chamar em páginas/actions após getSession(); passar supabase quando PERSISTENCE=supabase.
 */
export function getAvaliacaoUseCases(
  supabase?: SupabaseClient<Database>,
  userId?: string
): AvaliacaoUseCases {
  return createAvaliacaoUseCases(supabase, userId);
}

export type AuthenticatedUseCasesResult = {
  uc: AvaliacaoUseCases;
  user: AuthUser;
  supabaseClient: SupabaseClient<Database>;
};

/**
 * Obtém sessão autenticada e use cases em um único passo. Redireciona para /login se não autenticado.
 * Use em páginas e server actions que precisam de usuário + use cases.
 */
export async function getAuthenticatedUseCases(): Promise<AuthenticatedUseCasesResult> {
  const ctx = await getSessionContext({ redirectIfUnauthenticated: true });
  if (!ctx) {
    throw new Error("getAuthenticatedUseCases: sessão esperada após redirectIfUnauthenticated");
  }
  const uc = createAvaliacaoUseCases(ctx.supabaseClient, ctx.user.id);
  return {
    uc,
    user: ctx.user,
    supabaseClient: ctx.supabaseClient,
  };
}
