import { scryptSync, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "@/src/infrastructure/supabase/database.types";

const TABLE = "profiles";
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SALT_BYTES = 16;

export interface UnlockPasswordStored {
  hash: string;
  salt: string;
}

/** Retorna true se o erro indica que a tabela profiles não existe (migration não aplicada). */
function isTableNotFoundError(message: string): boolean {
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export async function getUnlockPasswordHash(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UnlockPasswordStored | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("unlock_password_hash, unlock_password_salt")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isTableNotFoundError(error.message)) return null;
    throw new Error(`getUnlockPasswordHash: ${error.message}`);
  }
  const row = data as Pick<ProfileRow, "unlock_password_hash" | "unlock_password_salt"> | null;
  if (!row?.unlock_password_hash || !row?.unlock_password_salt) return null;
  return { hash: row.unlock_password_hash, salt: row.unlock_password_salt };
}

export async function setUnlockPassword(
  supabase: SupabaseClient<Database>,
  userId: string,
  senhaPlain: string
): Promise<void> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = hashPassword(senhaPlain, salt);
  const row: ProfileRow = {
    user_id: userId,
    unlock_password_hash: hash,
    unlock_password_salt: salt,
  };
  // Table "profiles" is in database.types.ts; Supabase client may not infer it until types are regenerated
  const table = supabase.from(TABLE) as unknown as { upsert: (values: ProfileRow, options?: { onConflict?: string }) => Promise<{ error: { message: string } | null }> };
  const { error } = await table.upsert(row, { onConflict: "user_id" });
  if (error) {
    if (isTableNotFoundError(error.message)) {
      throw new Error(
        "A tabela de senha de desbloqueio ainda não existe. Execute as migrações do Supabase (ex.: npx supabase db push)."
      );
    }
    throw new Error(`setUnlockPassword: ${error.message}`);
  }
}

export function hashPassword(senhaPlain: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(senhaPlain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N }).toString("hex");
}

export function verifyUnlockPassword(
  senhaPlain: string,
  storedHash: string,
  storedSalt: string
): boolean {
  const computed = hashPassword(senhaPlain, storedSalt);
  return computed.length === storedHash.length && computed === storedHash;
}
