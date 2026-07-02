import mongoose from "mongoose";
import type { UserRepository, UserForAuth } from "@/src/application/auth/ports";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { UserModel, type UserDoc } from "@/src/infrastructure/mongo/models";

function docToUserForAuth(doc: Pick<UserDoc, "_id" | "email" | "password_hash" | "failed_login_attempts" | "locked_until">): UserForAuth {
  return {
    id: String(doc._id),
    email: doc.email,
    password_hash: doc.password_hash,
    failed_login_attempts: doc.failed_login_attempts ?? 0,
    locked_until: doc.locked_until,
  };
}

export class UserRepositoryMongo implements UserRepository {
  async findByEmail(email: string): Promise<UserForAuth | null> {
    await getDb();
    const doc = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
    return doc ? docToUserForAuth(doc) : null;
  }

  async findById(id: string): Promise<UserForAuth | null> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(id).lean();
    return doc ? docToUserForAuth(doc) : null;
  }

  async insert(data: { email: string; password_hash: string | null; email_verified?: string | null }): Promise<void> {
    await getDb();
    await UserModel.create({
      email: data.email.trim().toLowerCase(),
      password_hash: data.password_hash ?? null,
      email_verified: data.email_verified ?? null,
    });
  }

  async updateFailedLogin(userId: string, attempts: number, lockedUntil: string | null): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne(
      { _id: userId },
      { failed_login_attempts: attempts, locked_until: lockedUntil, updated_at: new Date().toISOString() }
    );
  }

  async resetFailedLogin(userId: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne(
      { _id: userId },
      { failed_login_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne({ _id: userId }, { password_hash: passwordHash, updated_at: new Date().toISOString() });
  }
}
