import type { ConsultaRepository } from "@/src/application/ports";
import type { Consulta } from "@/src/domain";
import { getSupabase } from "@/src/infrastructure/supabase/server";
import type { ConsultaRow } from "@/src/infrastructure/supabase/database.types";

const TABLE = "consultas";

function rowToConsulta(row: Record<string, unknown>): Consulta {
  return {
    id: row.id as string,
    patient_id: row.patient_id as string,
    date: row.date as string,
    clinico: row.clinico as Consulta["clinico"],
    estrutura: row.estrutura as Consulta["estrutura"],
    fase_indicada: row.fase_indicada as Consulta["fase_indicada"],
    impressao_clinica: row.impressao_clinica as string | undefined,
    comparacao: row.comparacao as Consulta["comparacao"],
  };
}

export class ConsultaRepositorySupabase implements ConsultaRepository {
  async save(consulta: Consulta): Promise<void> {
    const supabase = getSupabase();
    const row: ConsultaRow = {
      id: consulta.id,
      patient_id: consulta.patient_id,
      date: consulta.date,
      clinico: consulta.clinico ?? null,
      estrutura: consulta.estrutura ?? null,
      fase_indicada: consulta.fase_indicada ?? null,
      impressao_clinica: consulta.impressao_clinica ?? null,
      comparacao: consulta.comparacao ?? null,
    };
    const { error } = await supabase.from(TABLE).upsert(row as never, {
      onConflict: "id",
    });
    if (error) throw new Error(`ConsultaRepositorySupabase.save: ${error.message}`);
  }

  async findById(id: string): Promise<Consulta | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`ConsultaRepositorySupabase.findById: ${error.message}`);
    return data ? rowToConsulta(data) : null;
  }

  async findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("patient_id", patientId)
      .order("date", { ascending: true });
    if (error) throw new Error(`ConsultaRepositorySupabase.findByPatientIdOrderByDate: ${error.message}`);
    return (data ?? []).map(rowToConsulta);
  }

  async getUltimaConsultaAntesDe(patientId: string, date: string): Promise<Consulta | null> {
    const list = await this.findByPatientIdOrderByDate(patientId);
    const anteriores = list.filter((c) => c.date < date);
    return anteriores.length > 0 ? anteriores[anteriores.length - 1]! : null;
  }
}
