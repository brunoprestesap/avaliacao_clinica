/**
 * DTOs e tipos da camada de autenticação (framework-agnósticos).
 */

export interface AuthUserDto {
  id: string;
  email: string;
}

export interface RegisterUserInput {
  email: string;
  passwordHash: string;
}

export interface ValidateCredentialsInput {
  email: string;
  password: string;
}

export type ValidateCredentialsResult =
  | { success: true; user: AuthUserDto }
  | { success: false; reason: "not_found" | "no_password" | "wrong_password" | "account_locked"; message?: string };

export interface RequestPasswordResetInput {
  email: string;
}

export interface ResetPasswordInput {
  tokenId: string;
  rawToken: string;
  passwordHash: string;
}

export type ResetPasswordResult =
  | { success: true }
  | { success: false; reason: "invalid_token" | "expired"; message: string };

export interface UnlockAccountInput {
  tokenId: string;
  rawToken: string;
}

export type UnlockAccountResult =
  | { success: true }
  | { success: false; reason: "invalid_token" | "expired"; message: string };

export interface CreateAccountUnlockTokenResult {
  userId: string;
  userEmail: string;
  tokenId: string;
  rawToken: string;
}
