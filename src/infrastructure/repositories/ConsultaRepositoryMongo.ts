import type { ConsultaRepository } from "@/src/application/ports";
import type { Consulta, FaseIndicadaLabel } from "@/src/domain";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { ConsultaModel, PacienteModel, type ConsultaDoc } from "@/src/infrastructure/mongo/models";

/** Mapeamento legado: novas linhas gravam o código numérico da fase como texto. */
const FASE_TO_NUMBER: Record<FaseIndicadaLabel, number> = {
  Essência: 1,
  Núcleo: 2,
  Integral: 4,
};

/** Linhas antigas podem conter o código numérico OU o rótulo por extenso — aceitar ambos. */
const NUMBER_TO_FASE: Record<number, FaseIndicadaLabel> = {
  1: "Essência",
  2: "Núcleo",
  3: "Integral",
  4: "Integral",
};

function normalizeFaseFromRow(value: string | null): Consulta["fase_indicada"] {
  if (value == null) return undefined;
  const s = value.trim();
  const num = Number(s);
  if (Number.isInteger(num) && NUMBER_TO_FASE[num]) return NUMBER_TO_FASE[num];
  if (s === "Integral" || s === "Núcleo" || s === "Essência") return s as FaseIndicadaLabel;
  return undefined;
}

function docToConsulta(doc: ConsultaDoc): Consulta {
  return {
    id: doc._id,
    patient_id: doc.patient_id,
    date: doc.date,
    clinico: doc.clinico ?? undefined,
    estrutura: doc.estrutura ?? undefined,
    fase_indicada: normalizeFaseFromRow(doc.fase_indicada),
    impressao_clinica: doc.impressao_clinica ?? undefined,
    comparacao: doc.comparacao ?? undefined,
  };
}

export class ConsultaRepositoryMongo implements ConsultaRepository {
  constructor(private userId?: string) {}

  private async assertOwnsPatient(patientId: string): Promise<void> {
    if (!this.userId) return;
    const owns = await PacienteModel.exists({ _id: patientId, user_id: this.userId });
    if (!owns) {
      throw new Error("ConsultaRepositoryMongo.save: Acesso negado ao paciente.");
    }
  }

  private async ownsOrUnrestricted(patientId: string): Promise<boolean> {
    if (!this.userId) return true;
    const owns = await PacienteModel.exists({ _id: patientId, user_id: this.userId });
    return !!owns;
  }

  async save(consulta: Consulta): Promise<void> {
    await getDb();
    await this.assertOwnsPatient(consulta.patient_id);
    const faseValue = consulta.fase_indicada != null ? String(FASE_TO_NUMBER[consulta.fase_indicada]) : null;
    await ConsultaModel.findByIdAndUpdate(
      consulta.id,
      {
        _id: consulta.id,
        patient_id: consulta.patient_id,
        date: consulta.date,
        clinico: consulta.clinico ?? null,
        estrutura: consulta.estrutura ?? null,
        fase_indicada: faseValue,
        impressao_clinica: consulta.impressao_clinica ?? null,
        comparacao: consulta.comparacao ?? null,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async findById(id: string): Promise<Consulta | null> {
    await getDb();
    const doc = await ConsultaModel.findById(id).lean();
    if (!doc) return null;
    if (!(await this.ownsOrUnrestricted(doc.patient_id))) return null;
    return docToConsulta(doc);
  }

  async findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]> {
    await getDb();
    if (!(await this.ownsOrUnrestricted(patientId))) return [];
    const docs = await ConsultaModel.find({ patient_id: patientId }).sort({ date: 1 }).lean();
    return docs.map(docToConsulta);
  }

  async getUltimaConsultaAntesDe(patientId: string, currentConsultaId: string): Promise<Consulta | null> {
    await getDb();
    const atual = await this.findById(currentConsultaId);
    if (!atual) return null;
    if (!(await this.ownsOrUnrestricted(patientId))) return null;
    const doc = await ConsultaModel.findOne({
      patient_id: patientId,
      date: { $lt: atual.date },
      clinico: { $ne: null },
      estrutura: { $ne: null },
    })
      .sort({ date: -1 })
      .lean();
    return doc ? docToConsulta(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await getDb();
    if (this.userId) {
      const existing = await this.findById(id);
      if (!existing) return;
    }
    await ConsultaModel.deleteOne({ _id: id });
  }
}
