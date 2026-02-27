import type { ConsultaRepository } from "../ports";
import type { Consulta } from "@/src/domain";

export function createListarHistoricoPaciente(repo: ConsultaRepository) {
  return async function listarHistoricoPaciente(
    patientId: string
  ): Promise<Consulta[]> {
    return repo.findByPatientIdOrderByDate(patientId);
  };
}
