/**
 * Script one-off: migra os dados do Supabase Cloud para o MongoDB Atlas.
 * Requer as credenciais do Supabase (para leitura) e MONGODB_URI (para escrita) no ambiente.
 * Executar: npx tsx scripts/migrate-supabase-to-mongo.ts
 * (ou: npx dotenv -e .env.production.local -- npx tsx scripts/migrate-supabase-to-mongo.ts)
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import mongoose from "mongoose";
import {
  PacienteModel,
  ConsultaModel,
  UserModel,
  ProfileModel,
  PasswordResetTokenModel,
  AccountUnlockTokenModel,
} from "../src/infrastructure/mongo/models";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mongoUri = process.env.MONGODB_URI;

if (!supabaseUrl || !supabaseKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (origem).");
  process.exit(1);
}
if (!mongoUri) {
  console.error("Defina MONGODB_URI (destino).");
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl as string, supabaseKey as string, { auth: { persistSession: false } });
  await mongoose.connect(mongoUri as string);

  const { data: users, error: usersError } = await supabase.from("users").select("*");
  if (usersError) throw new Error(`Erro ao ler users: ${usersError.message}`);
  const userIdMap = new Map<string, string>();
  for (const u of users ?? []) {
    const doc = await UserModel.create({
      email: u.email,
      password_hash: u.password_hash,
      email_verified: u.email_verified,
      failed_login_attempts: u.failed_login_attempts ?? 0,
      locked_until: u.locked_until,
      created_at: u.created_at,
      updated_at: u.updated_at,
    });
    userIdMap.set(u.id, String(doc._id));
  }
  console.log(`users: ${userIdMap.size} migrados`);

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");
  if (profilesError) throw new Error(`Erro ao ler profiles: ${profilesError.message}`);
  let profilesCount = 0;
  for (const p of profiles ?? []) {
    const newUserId = userIdMap.get(p.user_id);
    if (!newUserId) continue;
    await ProfileModel.create({
      user_id: newUserId,
      unlock_password_hash: p.unlock_password_hash,
      unlock_password_salt: p.unlock_password_salt,
    });
    profilesCount++;
  }
  console.log(`profiles: ${profilesCount} migrados`);

  const { data: pacientes, error: pacientesError } = await supabase.from("pacientes").select("*");
  if (pacientesError) throw new Error(`Erro ao ler pacientes: ${pacientesError.message}`);
  for (const p of pacientes ?? []) {
    await PacienteModel.create({
      _id: p.id,
      nome: p.nome,
      identificador: p.identificador,
      user_id: p.user_id ? (userIdMap.get(p.user_id) ?? null) : null,
    });
  }
  console.log(`pacientes: ${(pacientes ?? []).length} migrados`);

  const { data: consultas, error: consultasError } = await supabase.from("consultas").select("*");
  if (consultasError) throw new Error(`Erro ao ler consultas: ${consultasError.message}`);
  for (const c of consultas ?? []) {
    await ConsultaModel.create({
      _id: c.id,
      patient_id: c.patient_id,
      date: c.date,
      clinico: c.clinico ?? null,
      estrutura: c.estrutura ?? null,
      fase_indicada: c.fase_indicada != null ? String(c.fase_indicada) : null,
      impressao_clinica: c.impressao_clinica ?? null,
      comparacao: c.comparacao ?? null,
    });
  }
  console.log(`consultas: ${(consultas ?? []).length} migrados`);

  const { data: prTokens, error: prTokensError } = await supabase.from("password_reset_tokens").select("*");
  if (prTokensError) throw new Error(`Erro ao ler password_reset_tokens: ${prTokensError.message}`);
  let prCount = 0;
  for (const t of prTokens ?? []) {
    const newUserId = userIdMap.get(t.user_id);
    if (!newUserId) continue;
    await PasswordResetTokenModel.create({
      token_hash: t.token_hash,
      user_id: newUserId,
      expires_at: t.expires_at,
      created_at: t.created_at,
    });
    prCount++;
  }
  console.log(`password_reset_tokens: ${prCount} migrados`);

  const { data: auTokens, error: auTokensError } = await supabase.from("account_unlock_tokens").select("*");
  if (auTokensError) throw new Error(`Erro ao ler account_unlock_tokens: ${auTokensError.message}`);
  let auCount = 0;
  for (const t of auTokens ?? []) {
    const newUserId = userIdMap.get(t.user_id);
    if (!newUserId) continue;
    await AccountUnlockTokenModel.create({
      token_hash: t.token_hash,
      user_id: newUserId,
      expires_at: t.expires_at,
      created_at: t.created_at,
    });
    auCount++;
  }
  console.log(`account_unlock_tokens: ${auCount} migrados`);

  await mongoose.disconnect();
  console.log("Migração concluída.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
