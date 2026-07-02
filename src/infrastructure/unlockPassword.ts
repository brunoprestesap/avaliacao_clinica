/**
 * Senha de desbloqueio da avaliação (equipe de saúde).
 * Usada na tela "desbloquear" para permitir à equipe de saúde gerar o resultado após o paciente preencher.
 * Não confundir com desbloqueio de conta (auth), que usa account_unlock_tokens e auth-actions.
 */
import { scryptSync, randomBytes } from "node:crypto";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { ProfileModel } from "@/src/infrastructure/mongo/models";

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SALT_BYTES = 16;

/** Hash e salt da senha de desbloqueio da equipe de saúde (tela de gerar resultado). */
export interface UnlockPasswordStored {
  hash: string;
  salt: string;
}

/** Obtém hash/salt da senha de desbloqueio da equipe de saúde (profiles) para o usuário. */
export async function getUnlockPasswordHash(userId: string): Promise<UnlockPasswordStored | null> {
  await getDb();
  const doc = await ProfileModel.findOne({ user_id: userId }).lean();
  if (!doc?.unlock_password_hash || !doc?.unlock_password_salt) return null;
  return { hash: doc.unlock_password_hash, salt: doc.unlock_password_salt };
}

/** Define a senha de desbloqueio da equipe de saúde (Configurações). */
export async function setUnlockPassword(userId: string, senhaPlain: string): Promise<void> {
  await getDb();
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const storedHash = hashPassword(senhaPlain, salt);
  await ProfileModel.findOneAndUpdate(
    { user_id: userId },
    { unlock_password_hash: storedHash, unlock_password_salt: salt },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

export function hashPassword(senhaPlain: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(senhaPlain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N }).toString("hex");
}

/** Verifica a senha de desbloqueio da equipe de saúde (tela desbloquear → gerar). */
export function verifyUnlockPassword(
  senhaPlain: string,
  storedHash: string,
  storedSalt: string
): boolean {
  const computed = hashPassword(senhaPlain, storedSalt);
  return computed.length === storedHash.length && computed === storedHash;
}
