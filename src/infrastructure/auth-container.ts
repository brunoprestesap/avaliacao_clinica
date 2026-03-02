import "server-only";
import { getSupabase } from "@/src/infrastructure/supabase/server";
import { UserRepositorySupabase } from "@/src/infrastructure/repositories/UserRepositorySupabase";
import { AuthTokenRepositorySupabase } from "@/src/infrastructure/repositories/AuthTokenRepositorySupabase";
import { createAuthService } from "@/src/application/auth/AuthService";
import { authEmailSender } from "@/app/lib/email";

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (u) return u.startsWith("http") ? u : `https://${u}`;
  return "http://localhost:3000";
}

let authServiceInstance: ReturnType<typeof createAuthService> | null = null;

/**
 * Retorna uma instância do AuthService construída com repositórios Supabase e o envio de email da app.
 * Usado por auth-options e auth-actions.
 */
export function getAuthService() {
  if (!authServiceInstance) {
    const supabase = getSupabase();
    const userRepo = new UserRepositorySupabase(supabase);
    const tokenRepo = new AuthTokenRepositorySupabase(supabase);
    authServiceInstance = createAuthService(userRepo, tokenRepo, authEmailSender, {
      getBaseUrl,
    });
  }
  return authServiceInstance;
}
