import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRepository, UserForAuth } from "@/src/application/auth/ports";
import type { Database } from "@/src/infrastructure/supabase/database.types";

const TABLE = "users";

function rowToUserForAuth(row: {
  id: string;
  email: string;
  password_hash: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
}): UserForAuth {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    failed_login_attempts: row.failed_login_attempts ?? 0,
    locked_until: row.locked_until,
  };
}

export class UserRepositorySupabase implements UserRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findByEmail(email: string): Promise<UserForAuth | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select("id, email, password_hash, failed_login_attempts, locked_until")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw new Error(`UserRepositorySupabase.findByEmail: ${error.message}`);
    return data ? rowToUserForAuth(data) : null;
  }

  async findById(id: string): Promise<UserForAuth | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select("id, email, password_hash, failed_login_attempts, locked_until")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`UserRepositorySupabase.findById: ${error.message}`);
    return data ? rowToUserForAuth(data) : null;
  }

  async insert(data: {
    email: string;
    password_hash: string | null;
    email_verified?: string | null;
  }): Promise<void> {
    const row: Database["public"]["Tables"]["users"]["Insert"] = {
      email: data.email.trim().toLowerCase(),
      password_hash: data.password_hash ?? null,
      email_verified: data.email_verified ?? null,
    };
    const { error } = await this.supabase.from(TABLE).insert(row as never);
    if (error) throw new Error(`UserRepositorySupabase.insert: ${error.message}`);
  }

  async updateFailedLogin(
    userId: string,
    attempts: number,
    lockedUntil: string | null
  ): Promise<void> {
    const update: Database["public"]["Tables"]["users"]["Update"] = {
      failed_login_attempts: attempts,
      locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.supabase.from(TABLE).update(update as never).eq("id", userId);
    if (error) throw new Error(`UserRepositorySupabase.updateFailedLogin: ${error.message}`);
  }

  async resetFailedLogin(userId: string): Promise<void> {
    const update: Database["public"]["Tables"]["users"]["Update"] = {
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.supabase.from(TABLE).update(update as never).eq("id", userId);
    if (error) throw new Error(`UserRepositorySupabase.resetFailedLogin: ${error.message}`);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const update: Database["public"]["Tables"]["users"]["Update"] = {
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.supabase.from(TABLE).update(update as never).eq("id", userId);
    if (error) throw new Error(`UserRepositorySupabase.updatePassword: ${error.message}`);
  }
}
