import { compare, hash } from "bcryptjs";
import { randomBytes } from "crypto";
import type { UserRepository, AuthTokenRepository, AuthEmailSender } from "./ports";
import type {
  AuthUserDto,
  RegisterUserInput,
  ValidateCredentialsInput,
  ValidateCredentialsResult,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ResetPasswordResult,
  UnlockAccountInput,
  UnlockAccountResult,
  CreateAccountUnlockTokenResult,
} from "./types";

const BCRYPT_ROUNDS = 10;
const LOCK_DURATION_HOURS = 24;
const MAX_FAILED_ATTEMPTS = 5;
const TOKEN_EXPIRY_HOURS = 24;

export interface AuthServiceConfig {
  getBaseUrl: () => string;
}

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private tokenRepo: AuthTokenRepository,
    private emailSender: AuthEmailSender,
    private config: AuthServiceConfig
  ) {}

  async registerUser(input: RegisterUserInput): Promise<{ success: true } | { success: false; reason: "email_taken" }> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(email);
    if (existing) return { success: false, reason: "email_taken" };
    await this.userRepo.insert({
      email,
      password_hash: input.passwordHash,
    });
    return { success: true };
  }

  /**
   * Valida credenciais e, em caso de sucesso, reseta contador de falhas de login.
   * Em caso de senha incorreta, incrementa falhas e pode bloquear a conta e enviar email de desbloqueio.
   */
  async validateUserCredentials(input: ValidateCredentialsInput): Promise<ValidateCredentialsResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(email);
    if (!user) return { success: false, reason: "not_found" };
    if (!user.password_hash) return { success: false, reason: "no_password" };

    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    if (lockedUntil && lockedUntil > new Date()) {
      return {
        success: false,
        reason: "account_locked",
        message: "Conta bloqueada. Verifique seu email para o link de desbloqueio.",
      };
    }

    const valid = await compare(input.password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_login_attempts ?? 0) + 1;
      let lockedUntilIso: string | null = null;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const d = new Date();
        d.setHours(d.getHours() + LOCK_DURATION_HOURS);
        lockedUntilIso = d.toISOString();
      }
      await this.userRepo.updateFailedLogin(user.id, attempts, lockedUntilIso);

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const result = await this.createAccountUnlockTokenAndSendEmail(user.id, user.email);
        if (result) {
          // token criado e email enviado
        }
      }
      return { success: false, reason: "wrong_password" };
    }

    await this.userRepo.resetFailedLogin(user.id);
    return {
      success: true,
      user: { id: user.id, email: user.email },
    };
  }

  /**
   * Cria token de desbloqueio de conta e envia email. Usado após bloqueio por tentativas de login.
   */
  async createAccountUnlockTokenAndSendEmail(
    userId: string,
    userEmail: string
  ): Promise<CreateAccountUnlockTokenResult | null> {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = await hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
    const { id: tokenId } = await this.tokenRepo.createAccountUnlockToken(
      userId,
      tokenHash,
      expiresAt.toISOString()
    );
    const baseUrl = this.config.getBaseUrl();
    const unlockLink = `${baseUrl}/auth/desbloquear-conta?id=${tokenId}&token=${rawToken}`;
    await this.emailSender.sendUnlockAccount(userEmail, unlockLink);
    return { userId, userEmail, tokenId, rawToken };
  }

  /**
   * OAuth: encontra usuário por email ou cria com email_verified.
   */
  async registerOrFindOAuthUser(email: string): Promise<AuthUserDto> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(normalized);
    if (existing) return { id: existing.id, email: existing.email };
    await this.userRepo.insert({
      email: normalized,
      password_hash: null,
      email_verified: new Date().toISOString(),
    });
    const created = await this.userRepo.findByEmail(normalized);
    if (!created) throw new Error("AuthService.registerOrFindOAuthUser: user not found after insert");
    return { id: created.id, email: created.email };
  }

  async requestPasswordReset(_input: RequestPasswordResetInput): Promise<void> {
    const email = _input.email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(email);
    if (!user) return;
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = await hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
    const { id: tokenId } = await this.tokenRepo.createPasswordResetToken(
      user.id,
      tokenHash,
      expiresAt.toISOString()
    );
    const baseUrl = this.config.getBaseUrl();
    const resetLink = `${baseUrl}/auth/reset-password?id=${tokenId}&token=${rawToken}`;
    await this.emailSender.sendPasswordReset(email, resetLink);
  }

  async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    const row = await this.tokenRepo.findPasswordResetTokenById(input.tokenId);
    if (!row) return { success: false, reason: "invalid_token", message: "Link inválido ou expirado. Solicite um novo." };
    if (new Date(row.expires_at) < new Date()) {
      return { success: false, reason: "expired", message: "Link expirado. Solicite um novo." };
    }
    const valid = await compare(input.rawToken, row.token_hash);
    if (!valid) {
      return { success: false, reason: "invalid_token", message: "Link inválido ou expirado. Solicite um novo." };
    }
    await this.userRepo.updatePassword(row.user_id, input.passwordHash);
    await this.tokenRepo.deletePasswordResetToken(row.id);
    return { success: true };
  }

  async unlockAccount(input: UnlockAccountInput): Promise<UnlockAccountResult> {
    const row = await this.tokenRepo.findAccountUnlockTokenById(input.tokenId);
    if (!row) {
      return { success: false, reason: "invalid_token", message: "Link inválido ou expirado." };
    }
    if (new Date(row.expires_at) < new Date()) {
      return { success: false, reason: "expired", message: "Link expirado. Solicite um novo após tentar login." };
    }
    const valid = await compare(input.rawToken, row.token_hash);
    if (!valid) {
      return { success: false, reason: "invalid_token", message: "Link inválido ou expirado." };
    }
    await this.userRepo.resetFailedLogin(row.user_id);
    await this.tokenRepo.deleteAccountUnlockToken(row.id);
    return { success: true };
  }
}

/** Factory: cria AuthService com repositórios Supabase e envio de email. */
export function createAuthService(
  userRepo: UserRepository,
  tokenRepo: AuthTokenRepository,
  emailSender: AuthEmailSender,
  config: AuthServiceConfig
): AuthService {
  return new AuthService(userRepo, tokenRepo, emailSender, config);
}
