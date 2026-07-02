import mongoose, { Schema, model, models } from "mongoose";
import type { ClinicoResultado, EstruturaResultado, ComparacaoResultado } from "@/src/domain";

export interface PacienteDoc {
  _id: string;
  nome: string;
  identificador: string;
  user_id: string | null;
}

const PacienteSchema = new Schema<PacienteDoc>(
  {
    _id: { type: String, required: true },
    nome: { type: String, required: true },
    identificador: { type: String, required: true },
    user_id: { type: String, default: null },
  },
  { versionKey: false, _id: false }
);
PacienteSchema.index(
  { user_id: 1, identificador: 1 },
  { unique: true, partialFilterExpression: { user_id: { $type: "string" } } }
);

export interface ConsultaDoc {
  _id: string;
  patient_id: string;
  date: string;
  clinico: ClinicoResultado | null;
  estrutura: EstruturaResultado | null;
  fase_indicada: string | null;
  impressao_clinica: string | null;
  comparacao: ComparacaoResultado | null;
}

const ConsultaSchema = new Schema<ConsultaDoc>(
  {
    _id: { type: String, required: true },
    patient_id: { type: String, required: true },
    date: { type: String, required: true },
    clinico: { type: Schema.Types.Mixed, default: null },
    estrutura: { type: Schema.Types.Mixed, default: null },
    fase_indicada: { type: String, default: null },
    impressao_clinica: { type: String, default: null },
    comparacao: { type: Schema.Types.Mixed, default: null },
  },
  { versionKey: false, _id: false }
);
ConsultaSchema.index({ patient_id: 1 });
ConsultaSchema.index({ patient_id: 1, date: 1 });

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string | null;
  email_verified: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, default: null },
    email_verified: { type: String, default: null },
    failed_login_attempts: { type: Number, default: 0 },
    locked_until: { type: String, default: null },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);

export interface ProfileDoc {
  user_id: string;
  unlock_password_hash: string;
  unlock_password_salt: string;
}

const ProfileSchema = new Schema<ProfileDoc>(
  {
    user_id: { type: String, required: true, unique: true },
    unlock_password_hash: { type: String, required: true },
    unlock_password_salt: { type: String, required: true },
  },
  { versionKey: false }
);

export interface PasswordResetTokenDoc {
  _id: mongoose.Types.ObjectId;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

const PasswordResetTokenSchema = new Schema<PasswordResetTokenDoc>(
  {
    token_hash: { type: String, required: true },
    user_id: { type: String, required: true },
    expires_at: { type: String, required: true },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);
PasswordResetTokenSchema.index({ user_id: 1 });
PasswordResetTokenSchema.index({ expires_at: 1 });

export interface AccountUnlockTokenDoc {
  _id: mongoose.Types.ObjectId;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

const AccountUnlockTokenSchema = new Schema<AccountUnlockTokenDoc>(
  {
    token_hash: { type: String, required: true },
    user_id: { type: String, required: true },
    expires_at: { type: String, required: true },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);
AccountUnlockTokenSchema.index({ user_id: 1 });
AccountUnlockTokenSchema.index({ expires_at: 1 });

export const PacienteModel =
  (models.Paciente as mongoose.Model<PacienteDoc>) || model<PacienteDoc>("Paciente", PacienteSchema, "pacientes");
export const ConsultaModel =
  (models.Consulta as mongoose.Model<ConsultaDoc>) || model<ConsultaDoc>("Consulta", ConsultaSchema, "consultas");
export const UserModel = (models.User as mongoose.Model<UserDoc>) || model<UserDoc>("User", UserSchema, "users");
export const ProfileModel =
  (models.Profile as mongoose.Model<ProfileDoc>) || model<ProfileDoc>("Profile", ProfileSchema, "profiles");
export const PasswordResetTokenModel =
  (models.PasswordResetToken as mongoose.Model<PasswordResetTokenDoc>) ||
  model<PasswordResetTokenDoc>("PasswordResetToken", PasswordResetTokenSchema, "password_reset_tokens");
export const AccountUnlockTokenModel =
  (models.AccountUnlockToken as mongoose.Model<AccountUnlockTokenDoc>) ||
  model<AccountUnlockTokenDoc>("AccountUnlockToken", AccountUnlockTokenSchema, "account_unlock_tokens");
