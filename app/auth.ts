import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/auth-options";
import { getSupabase } from "@/src/infrastructure/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/infrastructure/supabase/database.types";

export type AuthUser = {
  id: string;
  email?: string;
};

export type SessionContext = {
  session: Session;
  user: AuthUser;
  supabaseClient: SupabaseClient<Database>;
};

/**
 * Retorna o contexto de sessão autenticada com tipagem forte.
 * O isolamento entre usuários é feito via `userId` nos repositórios (ConsultaRepositorySupabase, PacienteRepositorySupabase),
 * não via RLS por JWT — o client Supabase no servidor é service role.
 */
export async function getSessionContext(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<SessionContext | null> {
  const session = await getServerSession(authOptions);
  const user: AuthUser | null = session?.user?.id
    ? {
        id: session.user.id,
        email: session.user.email ?? undefined,
      }
    : null;

  if (options?.redirectIfUnauthenticated && !user) {
    redirect("/login");
  }

  if (!session || !user) {
    return null;
  }

  const supabaseClient = getSupabase();
  return { session, user, supabaseClient };
}

export async function getSession(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<{
  supabase: SupabaseClient<Database> | null;
  user: AuthUser | null;
}> {
  const ctx = await getSessionContext(options);
  if (!ctx) {
    return { supabase: null, user: null };
  }
  return {
    supabase: ctx.supabaseClient,
    user: ctx.user,
  };
}
