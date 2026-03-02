import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Único ponto de criação do client Supabase no servidor.
 * Estratégia: service role + isolamento por userId nos repositórios.
 * O escopo por usuário é aplicado em ConsultaRepositorySupabase e PacienteRepositorySupabase
 * via userId no construtor; não usamos RLS por JWT.
 */
function createSupabaseServiceRoleClient(): SupabaseClient<Database> {
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
    serviceRoleClient = createSupabaseServiceRoleClient();
  }
  return serviceRoleClient;
}
