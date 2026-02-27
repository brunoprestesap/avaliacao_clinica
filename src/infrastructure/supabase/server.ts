import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set PERSISTENCE=supabase only when Supabase env vars are configured."
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
  if (!client) client = getSupabaseClient();
  return client as ReturnType<typeof createClient<Database>>;
}
