import type { ConsultaRepository } from "../ports";

export function createExcluirAvaliacaoEmBranco(repo: ConsultaRepository) {
  return async function excluirAvaliacaoEmBranco(consultaId: string): Promise<string> {
    const consulta = await repo.findById(consultaId);
    if (!consulta) {
      throw new Error("Avaliação não encontrada.");
    }
    if (consulta.clinico != null) {
      throw new Error("Avaliação já preenchida; não é possível excluir.");
    }
    await repo.delete(consultaId);
    return consulta.patient_id;
  };
}
