import type { SupabaseClient } from "@supabase/supabase-js";
import type { PacienteRepository } from "@/src/application/ports";
import type { Paciente } from "@/src/domain";
import type { Database } from "@/src/infrastructure/supabase/database.types";

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
  constructor(
    private supabase: SupabaseClient<Database>,
    private userId?: string
  ) {}

  async save(paciente: Paciente, ownerId?: string): Promise<void> {
    const resolvedOwnerId = ownerId ?? this.userId;
    const row: Database["public"]["Tables"]["pacientes"]["Insert"] = {
      id: paciente.id,
      nome: paciente.nome,
      identificador: paciente.identificador,
      user_id: resolvedOwnerId ?? null,
    };
    const { error } = await this.supabase.from(TABLE).upsert(row as never, {
      onConflict: "id",
    });
    if (error) throw new Error(`PacienteRepositorySupabase.save: ${error.message}`);
  }

  async findById(id: string): Promise<Paciente | null> {
    let q = this.supabase.from(TABLE).select("*").eq("id", id);
    if (this.userId) q = q.eq("user_id", this.userId);
    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(`PacienteRepositorySupabase.findById: ${error.message}`);
    return data ? rowToPaciente(data) : null;
  }

  async findByIdentificador(identificador: string): Promise<Paciente | null> {
    const normalized = identificador.trim().toLowerCase();
    let q = this.supabase.from(TABLE).select("*").ilike("identificador", normalized);
    if (this.userId) q = q.eq("user_id", this.userId);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw new Error(`PacienteRepositorySupabase.findByIdentificador: ${error.message}`);
    if (!data) return null;
    const p = rowToPaciente(data);
    if (p.identificador.toLowerCase() !== normalized) return null;
    return p;
  }

  async listarTodos(): Promise<Paciente[]> {
    let q = this.supabase.from(TABLE).select("*");
    if (this.userId) q = q.eq("user_id", this.userId);
    const { data, error } = await q.order("nome", { ascending: true });
    if (error) throw new Error(`PacienteRepositorySupabase.listarTodos: ${error.message}`);
    return (data ?? []).map(rowToPaciente);
  }

  async listarPaginado(
    offset: number,
    limit: number,
    query?: string
  ): Promise<{ pacientes: Paciente[]; total: number }> {
    let builder = this.supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("nome", { ascending: true });
    if (this.userId) {
      builder = builder.eq("user_id", this.userId);
    }
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
