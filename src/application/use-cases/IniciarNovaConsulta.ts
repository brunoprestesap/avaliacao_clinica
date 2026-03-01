import type { ConsultaRepository } from "../ports";
import type { Consulta } from "@/src/domain";

export function createIniciarNovaConsulta(repo: ConsultaRepository) {
  return async function iniciarNovaConsulta(patientId: string): Promise<string> {
    if (!patientId.trim()) throw new Error("patient_id é obrigatório.");
    const id = crypto.randomUUID();
    const date = new Date().toISOString();
    const consulta: Consulta = {
      id,
      patient_id: patientId,
      date,
    };
    await repo.save(consulta);
    return id;
  };
}
