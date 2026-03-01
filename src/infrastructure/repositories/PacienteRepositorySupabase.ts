import type { PacienteRepository } from "@/src/application/ports";
import type { Paciente } from "@/src/domain";
import { getSupabase } from "@/src/infrastructure/supabase/server";

const TABLE = "pacientes";

/** Escapa caracteres especiais do ilike no Postgres (%, _) e remove vírgula (separador do .or()). */
function escapeIlikePattern(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ");
}

function rowToPaciente(row: Record<string, unknown>): Paciente {
  return {
    id: row.id as string,
    nome: row.nome as string,
    identificador: row.identificador as string,
  };
}

export class PacienteRepositorySupabase implements PacienteRepository {
  async save(paciente: Paciente): Promise<void> {
    const supabase = getSupabase();
    const row = {
      id: paciente.id,
      nome: paciente.nome,
      identificador: paciente.identificador,
    };
    const { error } = await supabase.from(TABLE).upsert(row as never, {
      onConflict: "id",
    });
    if (error) throw new Error(`PacienteRepositorySupabase.save: ${error.message}`);
  }

  async findById(id: string): Promise<Paciente | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`PacienteRepositorySupabase.findById: ${error.message}`);
    return data ? rowToPaciente(data) : null;
  }

  async findByIdentificador(identificador: string): Promise<Paciente | null> {
    const supabase = getSupabase();
    const normalized = identificador.trim().toLowerCase();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .ilike("identificador", normalized)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`PacienteRepositorySupabase.findByIdentificador: ${error.message}`);
    if (!data) return null;
    const p = rowToPaciente(data);
    if (p.identificador.toLowerCase() !== normalized) return null;
    return p;
  }

  async listarTodos(): Promise<Paciente[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from(TABLE).select("*").order("nome", { ascending: true });
    if (error) throw new Error(`PacienteRepositorySupabase.listarTodos: ${error.message}`);
    return (data ?? []).map(rowToPaciente);
  }

  async listarPaginado(
    offset: number,
    limit: number,
    query?: string
  ): Promise<{ pacientes: Paciente[]; total: number }> {
    const supabase = getSupabase();
    let builder = supabase.from(TABLE).select("*", { count: "exact" }).order("nome", { ascending: true });
    if (query && query.trim() !== "") {
      const pattern = `%${escapeIlikePattern(query.trim())}%`;
      builder = builder.or(`nome.ilike.${pattern},identificador.ilike.${pattern}`);
    }
    const { data, error, count } = await builder.range(offset, offset + limit - 1);
    if (error) throw new Error(`PacienteRepositorySupabase.listarPaginado: ${error.message}`);
    return {
      pacientes: (data ?? []).map(rowToPaciente),
      total: count ?? 0,
    };
  }
}
