/**
 * Script one-off: migra data/pacientes.json e data/consultas.json para Supabase.
 * Requer PERSISTENCE=supabase, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 * Executar: npx tsx scripts/migrate-json-to-supabase.ts
 * (ou: npx dotenv -e .env -- npx tsx scripts/migrate-json-to-supabase.ts)
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Consulta, Paciente } from "../src/domain/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: em .env)");
  process.exit(1);
}

const dataDir = process.env.DATA_DIR || join(process.cwd(), "data");
const supabaseUrl = url as string;
const supabaseKey = key as string;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  let pacientes: Paciente[] = [];
  try {
    const raw = await readFile(join(dataDir, "pacientes.json"), "utf-8");
    pacientes = JSON.parse(raw) as Paciente[];
    if (!Array.isArray(pacientes)) pacientes = [];
  } catch (e) {
    console.warn("pacientes.json não encontrado ou inválido:", (e as Error).message);
  }

  let consultas: Consulta[] = [];
  try {
    const raw = await readFile(join(dataDir, "consultas.json"), "utf-8");
    consultas = JSON.parse(raw) as Consulta[];
    if (!Array.isArray(consultas)) consultas = [];
  } catch (e) {
    console.warn("consultas.json não encontrado ou inválido:", (e as Error).message);
  }

  for (const p of pacientes) {
    const { error } = await supabase.from("pacientes").upsert(
      { id: p.id, nome: p.nome, identificador: p.identificador },
      { onConflict: "id" }
    );
    if (error) {
      console.error("Paciente", p.id, error.message);
      process.exit(1);
    }
  }
  console.log("Pacientes migrados:", pacientes.length);

  for (const c of consultas) {
    const row = {
      id: c.id,
      patient_id: c.patient_id,
      date: c.date,
      clinico: c.clinico ?? null,
      estrutura: c.estrutura ?? null,
      fase_indicada: c.fase_indicada ?? null,
      impressao_clinica: c.impressao_clinica ?? null,
      comparacao: c.comparacao ?? null,
    };
    const { error } = await supabase.from("consultas").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("Consulta", c.id, error.message);
      process.exit(1);
    }
  }
  console.log("Consultas migradas:", consultas.length);
}

main();