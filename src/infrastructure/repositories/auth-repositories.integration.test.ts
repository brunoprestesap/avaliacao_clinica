import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { UserModel, PasswordResetTokenModel, AccountUnlockTokenModel } from "@/src/infrastructure/mongo/models";
import { UserRepositoryMongo } from "./UserRepositoryMongo";
import { AuthTokenRepositoryMongo } from "./AuthTokenRepositoryMongo";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await UserModel.deleteMany({});
  await PasswordResetTokenModel.deleteMany({});
  await AccountUnlockTokenModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("UserRepositoryMongo", () => {
  const repo = new UserRepositoryMongo();
  const testEmail = "integration@test.local";

  it("insert e findByEmail retornam o usuário", async () => {
    await repo.insert({ email: testEmail, password_hash: "hash" });
    const user = await repo.findByEmail(testEmail);
    expect(user).not.toBeNull();
    expect(user!.email).toBe(testEmail);
    expect(user!.password_hash).toBe("hash");
    expect(user!.id).toBeDefined();
  });

  it("findById retorna o mesmo usuário", async () => {
    await repo.insert({ email: testEmail, password_hash: "hash" });
    const byEmail = await repo.findByEmail(testEmail);
    expect(byEmail).not.toBeNull();
    const byId = await repo.findById(byEmail!.id);
    expect(byId).toEqual(byEmail);
  });

  it("findById retorna null para id malformado (não é um ObjectId válido)", async () => {
    const result = await repo.findById("id-invalido");
    expect(result).toBeNull();
  });

  it("updateFailedLogin e resetFailedLogin alteram estado", async () => {
    await repo.insert({ email: testEmail, password_hash: "hash" });
    const user = await repo.findByEmail(testEmail);
    expect(user).not.toBeNull();
    const lockedUntil = new Date(Date.now() + 3600000).toISOString();
    await repo.updateFailedLogin(user!.id, 3, lockedUntil);
    const afterUpdate = await repo.findByEmail(testEmail);
    expect(afterUpdate!.failed_login_attempts).toBe(3);
    expect(afterUpdate!.locked_until).toBe(lockedUntil);
    await repo.resetFailedLogin(user!.id);
    const afterReset = await repo.findByEmail(testEmail);
    expect(afterReset!.failed_login_attempts).toBe(0);
    expect(afterReset!.locked_until).toBeNull();
  });
});

describe("AuthTokenRepositoryMongo", () => {
  const repo = new AuthTokenRepositoryMongo();
  let userId: string;

  beforeAll(async () => {
    const user = await UserModel.create({ email: "token@test.local", password_hash: null });
    userId = String(user._id);
  });

  it("createPasswordResetToken e findPasswordResetTokenById", async () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const { id } = await repo.createPasswordResetToken(userId, "tokenHash", expiresAt);
    expect(id).toBeDefined();
    const row = await repo.findPasswordResetTokenById(id);
    expect(row).not.toBeNull();
    expect(row!.user_id).toBe(userId);
    expect(row!.expires_at).toBe(expiresAt);
    await repo.deletePasswordResetToken(id);
    const afterDelete = await repo.findPasswordResetTokenById(id);
    expect(afterDelete).toBeNull();
  });

  it("createAccountUnlockToken e findAccountUnlockTokenById", async () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const { id } = await repo.createAccountUnlockToken(userId, "unlockHash", expiresAt);
    expect(id).toBeDefined();
    const row = await repo.findAccountUnlockTokenById(id);
    expect(row).not.toBeNull();
    expect(row!.user_id).toBe(userId);
    await repo.deleteAccountUnlockToken(id);
    const afterDelete = await repo.findAccountUnlockTokenById(id);
    expect(afterDelete).toBeNull();
  });

  it("findPasswordResetTokenById retorna null para id malformado", async () => {
    const result = await repo.findPasswordResetTokenById("id-invalido");
    expect(result).toBeNull();
  });
});
