import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server";
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
  let supabase: SupabaseClient<Database> | null = null;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    if (options?.redirectIfUnauthenticated) redirect("/login");
    return { supabase: null, user: null };
  }
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user: AuthUser | null = claims
    ? {
        id: claims.sub as string,
        email: (claims.email as string) ?? undefined,
      }
    : null;

  if (options?.redirectIfUnauthenticated && !user) {
    redirect("/login");
  }

  return { supabase, user };
}
