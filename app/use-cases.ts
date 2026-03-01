import type { AvaliacaoUseCases } from "@/src/application";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAvaliacaoUseCases } from "@/src/infrastructure/container";
import type { Database } from "@/src/infrastructure/supabase/database.types";

/**
 * Retorna use cases com cliente Supabase do request (sessão + RLS).
 * Chamar em páginas/actions após getSession(); passar supabase quando PERSISTENCE=supabase.
 */
export function getAvaliacaoUseCases(supabase?: SupabaseClient<Database>): AvaliacaoUseCases {
  return createAvaliacaoUseCases(supabase);
}
