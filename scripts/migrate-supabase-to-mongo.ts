/**
 * Script one-off: migra os dados do Supabase Cloud para o MongoDB Atlas.
 * Requer as credenciais do Supabase (para leitura) e MONGODB_URI (para escrita) no ambiente.
 * Executar: npx tsx scripts/migrate-supabase-to-mongo.ts
 * (ou: npx dotenv -e .env.production.local -- npx tsx scripts/migrate-supabase-to-mongo.ts)
 */
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

const PAGE_SIZE = 1000;

/**
 * Lê todas as linhas de uma tabela paginando com .range() — sem isso, o PostgREST
 * limita a resposta ao seu max-rows padrão (comumente 1000) e trunca silenciosamente
 * tabelas maiores, sem erro, resultando em perda de dados na migração.
 */
async function fetchAllRows<T>(supabase: SupabaseClient, table: string): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select("*").range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

interface SupabaseUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified: string | null;
  failed_login_attempts: number | null;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseProfileRow {
  user_id: string;
  unlock_password_hash: string;
  unlock_password_salt: string;
}

interface SupabasePacienteRow {
  id: string;
  nome: string;
  identificador: string;
  user_id: string | null;
}

interface SupabaseConsultaRow {
  id: string;
  patient_id: string;
  date: string;
  clinico: unknown;
  estrutura: unknown;
  fase_indicada: string | number | null;
  impressao_clinica: string | null;
  comparacao: unknown;
}

interface SupabaseTokenRow {
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

async function main() {
  const supabase = createClient(supabaseUrl as string, supabaseKey as string, { auth: { persistSession: false } });
  await mongoose.connect(mongoUri as string);

  const users = await fetchAllRows<SupabaseUserRow>(supabase, "users");
  const userIdMap = new Map<string, string>();
  for (const u of users) {
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

  const profiles = await fetchAllRows<SupabaseProfileRow>(supabase, "profiles");
  let profilesCount = 0;
  for (const p of profiles) {
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

  const pacientes = await fetchAllRows<SupabasePacienteRow>(supabase, "pacientes");
  let pacientesCount = 0;
  for (const p of pacientes) {
    // Mesmo critério de profiles/tokens: paciente com user_id que não existe mais
    // (ou nunca existiu) é pulado, em vez de migrado com user_id nulo — evita criar
    // um paciente "órfão" invisível ao filtro de multi-tenancy por usuário do app.
    if (p.user_id && !userIdMap.get(p.user_id)) continue;
    await PacienteModel.create({
      _id: p.id,
      nome: p.nome,
      identificador: p.identificador,
      user_id: p.user_id ? (userIdMap.get(p.user_id) ?? null) : null,
    });
    pacientesCount++;
  }
  console.log(`pacientes: ${pacientesCount} migrados (${pacientes.length - pacientesCount} pulados por user_id órfão)`);

  const consultas = await fetchAllRows<SupabaseConsultaRow>(supabase, "consultas");
  for (const c of consultas) {
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
  console.log(`consultas: ${consultas.length} migrados`);

  const prTokens = await fetchAllRows<SupabaseTokenRow>(supabase, "password_reset_tokens");
  let prCount = 0;
  for (const t of prTokens) {
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

  const auTokens = await fetchAllRows<SupabaseTokenRow>(supabase, "account_unlock_tokens");
  let auCount = 0;
  for (const t of auTokens) {
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
