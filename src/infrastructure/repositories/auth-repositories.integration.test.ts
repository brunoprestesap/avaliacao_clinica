/**
 * Testes de integração para UserRepositorySupabase e AuthTokenRepositorySupabase.
 * Rodam apenas quando NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidos
 * (ex.: Supabase local com `npx supabase start` e .env.test).
 *
 * Executar com: INTEGRATION_SUPABASE=1 npm run test -- auth-repositories.integration
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/infrastructure/supabase/database.types";
import { UserRepositorySupabase } from "./UserRepositorySupabase";
import { AuthTokenRepositorySupabase } from "./AuthTokenRepositorySupabase";

const runIntegration =
  process.env.INTEGRATION_SUPABASE === "1" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabase(): ReturnType<typeof createClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

describe.skipIf(!runIntegration)("UserRepositorySupabase (integration)", () => {
  let supabase: ReturnType<typeof createSupabase>;
  let repo: UserRepositorySupabase;
  const testEmail = `integration-${Date.now()}@test.local`;

  beforeAll(() => {
    supabase = createSupabase();
    repo = new UserRepositorySupabase(supabase);
  });

  afterAll(async () => {
    await supabase.from("users").delete().eq("email", testEmail);
  });

  it("insert e findByEmail retornam o usuário", async () => {
    await repo.insert({
      email: testEmail,
      password_hash: "hash",
    });
    const user = await repo.findByEmail(testEmail);
    expect(user).not.toBeNull();
    expect(user!.email).toBe(testEmail);
    expect(user!.password_hash).toBe("hash");
    expect(user!.id).toBeDefined();
  });

  it("findById retorna o mesmo usuário", async () => {
    const byEmail = await repo.findByEmail(testEmail);
    expect(byEmail).not.toBeNull();
    const byId = await repo.findById(byEmail!.id);
    expect(byId).toEqual(byEmail);
  });

  it("updateFailedLogin e resetFailedLogin alteram estado", async () => {
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

describe.skipIf(!runIntegration)("AuthTokenRepositorySupabase (integration)", () => {
  let supabase: ReturnType<typeof createSupabase>;
  let repo: AuthTokenRepositorySupabase;
  let userId: string;

  beforeAll(async () => {
    supabase = createSupabase();
    repo = new AuthTokenRepositorySupabase(supabase);
    const testEmail = `token-${Date.now()}@test.local`;
    const { data } = await supabase.from("users").insert({ email: testEmail, password_hash: null } as never).select("id").single();
    userId = (data as { id: string }).id;
  });

  afterAll(async () => {
    await supabase.from("password_reset_tokens").delete().eq("user_id", userId);
    await supabase.from("account_unlock_tokens").delete().eq("user_id", userId);
    await supabase.from("users").delete().eq("id", userId);
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
});
