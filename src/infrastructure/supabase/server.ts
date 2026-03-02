import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Cliente com service role (bypass RLS). Usado em auth-options, auth-actions e scripts. No fluxo da app, use getSession() e o supabase retornado (JWT por usuário). */
function getSupabaseServiceRoleClient(): SupabaseClient<Database> {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

let serviceRoleClient: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!serviceRoleClient) {
    serviceRoleClient = getSupabaseServiceRoleClient();
  }
  return serviceRoleClient;
}
