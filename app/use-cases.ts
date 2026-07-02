import type { AvaliacaoUseCases } from "@/src/application";
import { createAvaliacaoUseCases } from "@/src/infrastructure/container";
import { getSessionContext } from "@/app/auth";
import type { AuthUser } from "@/app/auth";

/**
 * Retorna use cases com userId do request (escopo de tenant nos repositórios).
 * Chamar em páginas/actions após getSession(); passar userId quando PERSISTENCE=mongo.
 */
export function getAvaliacaoUseCases(userId?: string): AvaliacaoUseCases {
  return createAvaliacaoUseCases(userId);
}

export type AuthenticatedUseCasesResult = {
  uc: AvaliacaoUseCases;
  user: AuthUser;
};

/**
 * Obtém sessão autenticada e use cases em um único passo. Redireciona para /login se não autenticado.
 * Use em páginas e server actions que precisam de usuário + use cases.
 */
export async function getAuthenticatedUseCases(): Promise<AuthenticatedUseCasesResult> {
  const ctx = await getSessionContext({ redirectIfUnauthenticated: true });
  if (!ctx) {
    throw new Error("getAuthenticatedUseCases: sessão esperada após redirectIfUnauthenticated");
  }
  const uc = createAvaliacaoUseCases(ctx.user.id);
  return { uc, user: ctx.user };
}
