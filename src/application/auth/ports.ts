/**
 * Portas da camada de autenticação (repositórios e envio de email).
 */

/** Dados mínimos do usuário para fluxos de auth (evita dependência da infra no domínio). */
export interface UserForAuth {
  id: string;
  email: string;
  password_hash: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserForAuth | null>;
  findById(id: string): Promise<UserForAuth | null>;
  insert(data: { email: string; password_hash: string | null; email_verified?: string | null }): Promise<void>;
  updateFailedLogin(userId: string, attempts: number, lockedUntil: string | null): Promise<void>;
  resetFailedLogin(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}

export interface PasswordResetTokenRecord {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: string;
}

export interface AccountUnlockTokenRecord {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: string;
}

export interface AuthTokenRepository {
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }>;
  findPasswordResetTokenById(id: string): Promise<PasswordResetTokenRecord | null>;
  deletePasswordResetToken(id: string): Promise<void>;
  createAccountUnlockToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }>;
  findAccountUnlockTokenById(id: string): Promise<AccountUnlockTokenRecord | null>;
  deleteAccountUnlockToken(id: string): Promise<void>;
}

export interface AuthEmailSender {
  sendPasswordReset(to: string, resetLink: string): Promise<void>;
  sendUnlockAccount(to: string, unlockLink: string): Promise<void>;
}
