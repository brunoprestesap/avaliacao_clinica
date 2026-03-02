import type { ClinicoResultado, ComparacaoResultado, EstruturaResultado } from "@/src/domain";

export interface ConsultaRow {
  id: string;
  patient_id: string;
  date: string;
  clinico: ClinicoResultado | null;
  estrutura: EstruturaResultado | null;
  fase_indicada: string | null;
  impressao_clinica: string | null;
  comparacao: ComparacaoResultado | null;
}

/** Insert aceita fase_indicada como número (persistido como 1/2/4) ou string. */
export type ConsultaInsert = Omit<ConsultaRow, "fase_indicada"> & {
  fase_indicada?: string | number | null;
};

export interface PacienteRow {
  id: string;
  nome: string;
  identificador: string;
  user_id: string | null;
}

export interface ProfileRow {
  user_id: string;
  unlock_password_hash: string;
  unlock_password_salt: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface PasswordResetTokenRow {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface AccountUnlockTokenRow {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      consultas: { Row: ConsultaRow; Insert: ConsultaInsert; Update: Partial<ConsultaRow> };
      pacientes: { Row: PacienteRow; Insert: PacienteRow; Update: Partial<PacienteRow> };
      profiles: { Row: ProfileRow; Insert: ProfileRow; Update: Partial<ProfileRow> };
      users: {
        Row: UserRow;
        Insert: {
          id?: string;
          email: string;
          password_hash?: string | null;
          email_verified?: string | null;
          failed_login_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserRow, "id">>;
      };
      password_reset_tokens: {
        Row: PasswordResetTokenRow;
        Insert: Omit<PasswordResetTokenRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<PasswordResetTokenRow, "id">>;
      };
      account_unlock_tokens: {
        Row: AccountUnlockTokenRow;
        Insert: Omit<AccountUnlockTokenRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<AccountUnlockTokenRow, "id">>;
      };
    };
  };
}
