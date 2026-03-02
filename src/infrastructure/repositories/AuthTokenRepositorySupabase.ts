import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuthTokenRepository,
  PasswordResetTokenRecord,
  AccountUnlockTokenRecord,
} from "@/src/application/auth/ports";
import type { Database } from "@/src/infrastructure/supabase/database.types";

const PASSWORD_RESET_TABLE = "password_reset_tokens";
const ACCOUNT_UNLOCK_TABLE = "account_unlock_tokens";

export class AuthTokenRepositorySupabase implements AuthTokenRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: string
  ): Promise<{ id: string }> {
    const row: Database["public"]["Tables"]["password_reset_tokens"]["Insert"] = {
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
    };
    const { data, error } = await this.supabase
      .from(PASSWORD_RESET_TABLE)
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(`AuthTokenRepositorySupabase.createPasswordResetToken: ${error.message}`);
    const inserted = data as { id: string } | null;
    if (!inserted?.id) throw new Error("AuthTokenRepositorySupabase.createPasswordResetToken: no id returned");
    return { id: inserted.id };
  }

  async findPasswordResetTokenById(id: string): Promise<PasswordResetTokenRecord | null> {
    const { data, error } = await this.supabase
      .from(PASSWORD_RESET_TABLE)
      .select("id, token_hash, user_id, expires_at")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as PasswordResetTokenRecord;
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    const { error } = await this.supabase.from(PASSWORD_RESET_TABLE).delete().eq("id", id);
    if (error) throw new Error(`AuthTokenRepositorySupabase.deletePasswordResetToken: ${error.message}`);
  }

  async createAccountUnlockToken(
    userId: string,
    tokenHash: string,
    expiresAt: string
  ): Promise<{ id: string }> {
    const row: Database["public"]["Tables"]["account_unlock_tokens"]["Insert"] = {
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
    };
    const { data, error } = await this.supabase
      .from(ACCOUNT_UNLOCK_TABLE)
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(`AuthTokenRepositorySupabase.createAccountUnlockToken: ${error.message}`);
    const inserted = data as { id: string } | null;
    if (!inserted?.id) throw new Error("AuthTokenRepositorySupabase.createAccountUnlockToken: no id returned");
    return { id: inserted.id };
  }

  async findAccountUnlockTokenById(id: string): Promise<AccountUnlockTokenRecord | null> {
    const { data, error } = await this.supabase
      .from(ACCOUNT_UNLOCK_TABLE)
      .select("id, token_hash, user_id, expires_at")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as AccountUnlockTokenRecord;
  }

  async deleteAccountUnlockToken(id: string): Promise<void> {
    const { error } = await this.supabase.from(ACCOUNT_UNLOCK_TABLE).delete().eq("id", id);
    if (error) throw new Error(`AuthTokenRepositorySupabase.deleteAccountUnlockToken: ${error.message}`);
  }
}
