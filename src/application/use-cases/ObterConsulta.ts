import type { ConsultaRepository } from "../ports";
import type { Consulta } from "@/src/domain";

export function createObterConsulta(repo: ConsultaRepository) {
  return async function obterConsulta(consultaId: string): Promise<Consulta | null> {
    return repo.findById(consultaId);
  };
}
