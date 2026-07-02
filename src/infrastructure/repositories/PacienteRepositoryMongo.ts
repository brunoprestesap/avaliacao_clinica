import type { PacienteRepository } from "@/src/application/ports";
import type { Paciente } from "@/src/domain";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { PacienteModel, type PacienteDoc } from "@/src/infrastructure/mongo/models";

/** Escapa metacaracteres de regex (diferente do escape de LIKE do Postgres). */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function docToPaciente(doc: Pick<PacienteDoc, "_id" | "nome" | "identificador">): Paciente {
  return { id: doc._id, nome: doc.nome, identificador: doc.identificador };
}

export class PacienteRepositoryMongo implements PacienteRepository {
  constructor(private userId?: string) {}

  async save(paciente: Paciente, ownerId?: string): Promise<void> {
    await getDb();
    const resolvedOwnerId = ownerId ?? this.userId ?? null;
    await PacienteModel.findByIdAndUpdate(
      paciente.id,
      { _id: paciente.id, nome: paciente.nome, identificador: paciente.identificador, user_id: resolvedOwnerId },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async findById(id: string): Promise<Paciente | null> {
    await getDb();
    const filter: Record<string, unknown> = { _id: id };
    if (this.userId) filter.user_id = this.userId;
    const doc = await PacienteModel.findOne(filter).lean();
    return doc ? docToPaciente(doc) : null;
  }

  async findByIdentificador(identificador: string): Promise<Paciente | null> {
    await getDb();
    const normalized = identificador.trim().toLowerCase();
    const filter: Record<string, unknown> = {
      identificador: { $regex: `^${escapeRegExp(normalized)}$`, $options: "i" },
    };
    if (this.userId) filter.user_id = this.userId;
    const doc = await PacienteModel.findOne(filter).lean();
    if (!doc) return null;
    const p = docToPaciente(doc);
    if (p.identificador.toLowerCase() !== normalized) return null;
    return p;
  }

  async listarTodos(): Promise<Paciente[]> {
    await getDb();
    const filter: Record<string, unknown> = {};
    if (this.userId) filter.user_id = this.userId;
    const docs = await PacienteModel.find(filter).sort({ nome: 1 }).lean();
    return docs.map(docToPaciente);
  }

  async listarPaginado(
    offset: number,
    limit: number,
    query?: string
  ): Promise<{ pacientes: Paciente[]; total: number }> {
    await getDb();
    const filter: Record<string, unknown> = {};
    if (this.userId) filter.user_id = this.userId;
    if (query && query.trim() !== "") {
      const pattern = escapeRegExp(query.trim());
      filter.$or = [
        { nome: { $regex: pattern, $options: "i" } },
        { identificador: { $regex: pattern, $options: "i" } },
      ];
    }
    const [docs, total] = await Promise.all([
      PacienteModel.find(filter).sort({ nome: 1 }).skip(offset).limit(limit).lean(),
      PacienteModel.countDocuments(filter),
    ]);
    return { pacientes: docs.map(docToPaciente), total };
  }
}
