import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConsultaRepository } from "@/src/application/ports";
import type { Consulta, FaseIndicadaLabel } from "@/src/domain";
import type { Database } from "@/src/infrastructure/supabase/database.types";

const TABLE = "consultas";

const FASE_TO_NUMBER: Record<FaseIndicadaLabel, number> = {
  Essência: 1,
  Núcleo: 2,
  Integral: 4,
};

const NUMBER_TO_FASE: Record<number, FaseIndicadaLabel> = {
  1: "Essência",
  2: "Núcleo",
  3: "Integral",
  4: "Integral",
};

function normalizeFaseFromRow(value: unknown): Consulta["fase_indicada"] {
  if (value == null) return undefined;
  if (typeof value === "string") return value as FaseIndicadaLabel;
  if (typeof value === "number" && NUMBER_TO_FASE[value]) return NUMBER_TO_FASE[value];
  return undefined;
}

function rowToConsulta(row: Record<string, unknown>): Consulta {
  return {
    id: row.id as string,
    patient_id: row.patient_id as string,
    date: row.date as string,
    clinico: row.clinico as Consulta["clinico"],
    estrutura: row.estrutura as Consulta["estrutura"],
    fase_indicada: normalizeFaseFromRow(row.fase_indicada),
    impressao_clinica: row.impressao_clinica as string | undefined,
    comparacao: row.comparacao as Consulta["comparacao"],
  };
}

export class ConsultaRepositorySupabase implements ConsultaRepository {
  constructor(
    private supabase: SupabaseClient<Database>,
    private userId?: string
  ) {}

  async save(consulta: Consulta): Promise<void> {
    if (this.userId) {
      const { data: p, error: pErr } = await this.supabase
        .from("pacientes")
        .select("id")
        .eq("id", consulta.patient_id)
        .eq("user_id", this.userId)
        .maybeSingle();
      if (pErr) {
        throw new Error(`ConsultaRepositorySupabase.save: ${pErr.message}`);
      }
      if (!p) {
        throw new Error("ConsultaRepositorySupabase.save: Acesso negado ao paciente.");
      }
    }

    const faseValue =
      consulta.fase_indicada != null ? FASE_TO_NUMBER[consulta.fase_indicada] : null;
    const row = {
      id: consulta.id,
      patient_id: consulta.patient_id,
      date: consulta.date,
      clinico: consulta.clinico ?? null,
      estrutura: consulta.estrutura ?? null,
      fase_indicada: faseValue as string | number | null,
      impressao_clinica: consulta.impressao_clinica ?? null,
      comparacao: consulta.comparacao ?? null,
    };
    const { error } = await this.supabase.from(TABLE).upsert(row as never, {
      onConflict: "id",
    });
    if (error) throw new Error(`ConsultaRepositorySupabase.save: ${error.message}`);
  }

  async findById(id: string): Promise<Consulta | null> {
    if (this.userId) {
      const { data, error } = await this.supabase
        .from(TABLE)
        .select("*, pacientes!inner(user_id)")
        .eq("id", id)
        .eq("pacientes.user_id", this.userId)
        .maybeSingle();
      if (error) throw new Error(`ConsultaRepositorySupabase.findById: ${error.message}`);
      if (!data) return null;
      const { pacientes: _pacientes, ...row } = data as unknown as Record<string, unknown> & {
        pacientes?: unknown;
      };
      return rowToConsulta(row);
    }

    const { data, error } = await this.supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`ConsultaRepositorySupabase.findById: ${error.message}`);
    return data ? rowToConsulta(data) : null;
  }

  async findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]> {
    let q = this.supabase.from(TABLE).select("*").eq("patient_id", patientId);
    if (this.userId) {
      q = this.supabase
        .from(TABLE)
        .select("*, pacientes!inner(user_id)")
        .eq("patient_id", patientId)
        .eq("pacientes.user_id", this.userId);
    }
    const { data, error } = await q.order("date", { ascending: true });
    if (error) throw new Error(`ConsultaRepositorySupabase.findByPatientIdOrderByDate: ${error.message}`);
    return (data ?? []).map((row) => {
      if (this.userId && row && typeof row === "object" && "pacientes" in row) {
        const { pacientes: _pacientes, ...rest } = row as Record<string, unknown>;
        return rowToConsulta(rest);
      }
      return rowToConsulta(row as unknown as Record<string, unknown>);
    });
  }

  async getUltimaConsultaAntesDe(patientId: string, currentConsultaId: string): Promise<Consulta | null> {
    const list = await this.findByPatientIdOrderByDate(patientId);
    const index = list.findIndex((c) => c.id === currentConsultaId);
    if (index <= 0) return null;
    for (let i = index - 1; i >= 0; i--) {
      const c = list[i]!;
      if (c.clinico && c.estrutura) return c;
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    if (this.userId) {
      const existing = await this.findById(id);
      if (!existing) {
        // Sem acesso ou inexistente: manter comportamento idempotente.
        return;
      }
    }
    const { error } = await this.supabase.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`ConsultaRepositorySupabase.delete: ${error.message}`);
  }
}
