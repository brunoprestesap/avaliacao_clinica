import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Cliente com sessão do usuário (cookies). Use em Server Components e Actions. RLS é aplicado. */
export async function createServerSupabaseClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY)."
    );
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll chamado de Server Component; proxy cuida do refresh.
        }
      },
    },
  });
}

/** Cliente com service role (bypass RLS). Apenas para scripts (ex.: migração). Não usar no fluxo da app. */
function getSupabaseServiceRoleClient() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

let serviceRoleClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
  if (!serviceRoleClient) {
    serviceRoleClient = getSupabaseServiceRoleClient();
  }
  return serviceRoleClient as ReturnType<typeof createClient<Database>>;
}
