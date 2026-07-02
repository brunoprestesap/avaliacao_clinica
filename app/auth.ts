import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/auth-options";

export type AuthUser = {
  id: string;
  email?: string;
};

export type SessionContext = {
  session: Session;
  user: AuthUser;
};

/**
 * Retorna o contexto de sessão autenticada com tipagem forte.
 * O isolamento entre usuários é feito via `userId` nos repositórios (ConsultaRepositoryMongo, PacienteRepositoryMongo).
 * Não há um "client de banco" por request no MongoDB — a conexão é global (src/infrastructure/mongo/connection.ts).
 */
export async function getSessionContext(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<SessionContext | null> {
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

  if (!session || !user) {
    return null;
  }

  return { session, user };
}

export async function getSession(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<{
  user: AuthUser | null;
}> {
  const ctx = await getSessionContext(options);
  if (!ctx) {
    return { user: null };
  }
  return { user: ctx.user };
}
