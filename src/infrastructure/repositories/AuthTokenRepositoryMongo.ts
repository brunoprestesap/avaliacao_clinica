import mongoose from "mongoose";
import type {
  AuthTokenRepository,
  PasswordResetTokenRecord,
  AccountUnlockTokenRecord,
} from "@/src/application/auth/ports";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { PasswordResetTokenModel, AccountUnlockTokenModel } from "@/src/infrastructure/mongo/models";

export class AuthTokenRepositoryMongo implements AuthTokenRepository {
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }> {
    await getDb();
    const doc = await PasswordResetTokenModel.create({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt });
    return { id: String(doc._id) };
  }

  async findPasswordResetTokenById(id: string): Promise<PasswordResetTokenRecord | null> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await PasswordResetTokenModel.findById(id).lean();
    if (!doc) return null;
    return { id: String(doc._id), token_hash: doc.token_hash, user_id: doc.user_id, expires_at: doc.expires_at };
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await PasswordResetTokenModel.deleteOne({ _id: id });
  }

  async createAccountUnlockToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }> {
    await getDb();
    const doc = await AccountUnlockTokenModel.create({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt });
    return { id: String(doc._id) };
  }

  async findAccountUnlockTokenById(id: string): Promise<AccountUnlockTokenRecord | null> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await AccountUnlockTokenModel.findById(id).lean();
    if (!doc) return null;
    return { id: String(doc._id), token_hash: doc.token_hash, user_id: doc.user_id, expires_at: doc.expires_at };
  }

  async deleteAccountUnlockToken(id: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await AccountUnlockTokenModel.deleteOne({ _id: id });
  }
}
