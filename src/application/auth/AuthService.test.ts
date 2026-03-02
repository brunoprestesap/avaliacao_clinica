import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./AuthService";
import type { UserRepository, AuthTokenRepository, AuthEmailSender } from "./ports";

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
  hash: vi.fn().mockResolvedValue("hashed"),
}));

const bcrypt = await import("bcryptjs");

function createMocks() {
  const userRepo: UserRepository = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    insert: vi.fn().mockResolvedValue(undefined),
    updateFailedLogin: vi.fn().mockResolvedValue(undefined),
    resetFailedLogin: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
  };
  const tokenRepo: AuthTokenRepository = {
    createPasswordResetToken: vi.fn().mockResolvedValue({ id: "token-id" }),
    findPasswordResetTokenById: vi.fn(),
    deletePasswordResetToken: vi.fn().mockResolvedValue(undefined),
    createAccountUnlockToken: vi.fn().mockResolvedValue({ id: "unlock-id" }),
    findAccountUnlockTokenById: vi.fn(),
    deleteAccountUnlockToken: vi.fn().mockResolvedValue(undefined),
  };
  const emailSender: AuthEmailSender = {
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendUnlockAccount: vi.fn().mockResolvedValue(undefined),
  };
  const config = { getBaseUrl: () => "https://app.test" };
  return { userRepo, tokenRepo, emailSender, config };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.mocked(bcrypt.compare).mockReset();
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed");
  });

  describe("registerUser", () => {
    it("insere usuário quando email não existe", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.registerUser({
        email: "novo@test.com",
        passwordHash: "hashed",
      });

      expect(result).toEqual({ success: true });
      expect(userRepo.insert).toHaveBeenCalledWith({
        email: "novo@test.com",
        password_hash: "hashed",
      });
    });

    it("retorna email_taken quando email já existe", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(userRepo.findByEmail).mockResolvedValue({
        id: "u1",
        email: "existente@test.com",
        password_hash: "x",
        failed_login_attempts: 0,
        locked_until: null,
      });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.registerUser({
        email: "existente@test.com",
        passwordHash: "hashed",
      });

      expect(result).toEqual({ success: false, reason: "email_taken" });
      expect(userRepo.insert).not.toHaveBeenCalled();
    });
  });

  describe("validateUserCredentials", () => {
    it("retorna sucesso e reseta falhas quando senha correta", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(userRepo.findByEmail).mockResolvedValue({
        id: "u1",
        email: "u@test.com",
        password_hash: "hash",
        failed_login_attempts: 2,
        locked_until: null,
      });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.validateUserCredentials({
        email: "u@test.com",
        password: "senha123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toEqual({ id: "u1", email: "u@test.com" });
      }
      expect(userRepo.resetFailedLogin).toHaveBeenCalledWith("u1");
    });

    it("retorna wrong_password e incrementa falhas quando senha incorreta", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(bcrypt.compare).mockResolvedValue(false);
      vi.mocked(userRepo.findByEmail).mockResolvedValue({
        id: "u1",
        email: "u@test.com",
        password_hash: "hash",
        failed_login_attempts: 1,
        locked_until: null,
      });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.validateUserCredentials({
        email: "u@test.com",
        password: "errada",
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe("wrong_password");
      expect(userRepo.updateFailedLogin).toHaveBeenCalledWith("u1", 2, null);
    });

    it("retorna account_locked quando conta bloqueada", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      const lockedUntil = new Date(Date.now() + 3600000).toISOString();
      vi.mocked(userRepo.findByEmail).mockResolvedValue({
        id: "u1",
        email: "u@test.com",
        password_hash: "hash",
        failed_login_attempts: 5,
        locked_until: lockedUntil,
      });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.validateUserCredentials({
        email: "u@test.com",
        password: "qualquer",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("account_locked");
        expect(result.message).toContain("bloqueada");
      }
      expect(userRepo.updateFailedLogin).not.toHaveBeenCalled();
    });

    it("retorna not_found quando usuário não existe", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.validateUserCredentials({
        email: "nao@test.com",
        password: "x",
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe("not_found");
    });
  });

  describe("registerOrFindOAuthUser", () => {
    it("retorna usuário existente", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(userRepo.findByEmail).mockResolvedValue({
        id: "u1",
        email: "oauth@test.com",
        password_hash: null,
        failed_login_attempts: 0,
        locked_until: null,
      });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.registerOrFindOAuthUser("oauth@test.com");

      expect(result).toEqual({ id: "u1", email: "oauth@test.com" });
      expect(userRepo.insert).not.toHaveBeenCalled();
    });

    it("cria e retorna novo usuário quando não existe", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(userRepo.findByEmail)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "new-id",
          email: "novo@test.com",
          password_hash: null,
          failed_login_attempts: 0,
          locked_until: null,
        });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.registerOrFindOAuthUser("novo@test.com");

      expect(result.email).toBe("novo@test.com");
      expect(userRepo.insert).toHaveBeenCalledWith({
        email: "novo@test.com",
        password_hash: null,
        email_verified: expect.any(String),
      });
    });
  });

  describe("resetPassword", () => {
    it("atualiza senha e remove token quando válido", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(tokenRepo.findPasswordResetTokenById).mockResolvedValue({
        id: "tid",
        token_hash: "h",
        user_id: "u1",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.resetPassword({
        tokenId: "tid",
        rawToken: "raw",
        passwordHash: "newHash",
      });

      expect(result.success).toBe(true);
      expect(userRepo.updatePassword).toHaveBeenCalledWith("u1", "newHash");
      expect(tokenRepo.deletePasswordResetToken).toHaveBeenCalledWith("tid");
    });

    it("retorna invalid_token quando token não existe", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(tokenRepo.findPasswordResetTokenById).mockResolvedValue(null);
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.resetPassword({
        tokenId: "x",
        rawToken: "y",
        passwordHash: "z",
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe("invalid_token");
    });
  });

  describe("unlockAccount", () => {
    it("reseta falhas e remove token quando válido", async () => {
      const { userRepo, tokenRepo, emailSender, config } = createMocks();
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(tokenRepo.findAccountUnlockTokenById).mockResolvedValue({
        id: "aid",
        token_hash: "h",
        user_id: "u1",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
      const service = new AuthService(userRepo, tokenRepo, emailSender, config);

      const result = await service.unlockAccount({
        tokenId: "aid",
        rawToken: "raw",
      });

      expect(result.success).toBe(true);
      expect(userRepo.resetFailedLogin).toHaveBeenCalledWith("u1");
      expect(tokenRepo.deleteAccountUnlockToken).toHaveBeenCalledWith("aid");
    });
  });
});
