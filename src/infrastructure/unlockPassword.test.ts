import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getUnlockPasswordHash, setUnlockPassword, verifyUnlockPassword } from "./unlockPassword";

let mongod: MongoMemoryServer;
const userId = "user-unlock-1";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("unlockPassword", () => {
  it("retorna null quando ainda não há senha definida", async () => {
    const stored = await getUnlockPasswordHash(userId);
    expect(stored).toBeNull();
  });

  it("setUnlockPassword grava hash verificável por verifyUnlockPassword", async () => {
    await setUnlockPassword(userId, "minhaSenhaForte123");
    const stored = await getUnlockPasswordHash(userId);
    expect(stored).not.toBeNull();
    expect(verifyUnlockPassword("minhaSenhaForte123", stored!.hash, stored!.salt)).toBe(true);
    expect(verifyUnlockPassword("senhaErrada", stored!.hash, stored!.salt)).toBe(false);
  });

  it("setUnlockPassword é idempotente (upsert) ao ser chamado de novo", async () => {
    await setUnlockPassword(userId, "outraSenha456");
    const stored = await getUnlockPasswordHash(userId);
    expect(verifyUnlockPassword("outraSenha456", stored!.hash, stored!.salt)).toBe(true);
  });
});
