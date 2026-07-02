import "server-only";
import { UserRepositoryMongo } from "@/src/infrastructure/repositories/UserRepositoryMongo";
import { AuthTokenRepositoryMongo } from "@/src/infrastructure/repositories/AuthTokenRepositoryMongo";
import { createAuthService } from "@/src/application/auth/AuthService";
import { authEmailSender } from "@/app/lib/email";

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (u) return u.startsWith("http") ? u : `https://${u}`;
  return "http://localhost:3000";
}

let authServiceInstance: ReturnType<typeof createAuthService> | null = null;

/**
 * Retorna uma instância do AuthService construída com repositórios Mongo e o envio de email da app.
 * Usado por auth-options e auth-actions.
 */
export function getAuthService() {
  if (!authServiceInstance) {
    const userRepo = new UserRepositoryMongo();
    const tokenRepo = new AuthTokenRepositoryMongo();
    authServiceInstance = createAuthService(userRepo, tokenRepo, authEmailSender, {
      getBaseUrl,
    });
  }
  return authServiceInstance;
}
