import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth-options";
import { getSupabase } from "@/src/infrastructure/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/infrastructure/supabase/database.types";

export type AuthUser = {
  id: string;
  email?: string;
};

export async function getSession(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<{
  supabase: SupabaseClient<Database> | null;
  user: AuthUser | null;
}> {
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

  if (!user) {
    return { supabase: null, user: null };
  }

  // Importante: Supabase pode estar configurado com "JWT Signing Keys" (ES256/RS256),
  // onde a chave privada não é extraível — então não é possível "mintar" JWTs aqui
  // usando `SUPABASE_JWT_SECRET`. Para manter o app funcional, usamos o client
  // com service role no server e aplicamos o escopo por `user_id` nos repositórios.
  const supabase: SupabaseClient<Database> = getSupabase();
  return { supabase, user };
}
