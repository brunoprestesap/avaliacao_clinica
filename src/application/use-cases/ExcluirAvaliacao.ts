import type { ConsultaRepository } from "../ports";

/**
 * Use case: excluir uma avaliação de consulta (em branco ou com dados).
 * Retorna o patient_id para redirecionamento ao histórico do paciente.
 * @throws Error "Avaliação não encontrada." quando o id não existe ou não pertence ao usuário.
 */
export function createExcluirAvaliacao(repo: ConsultaRepository) {
  return async function excluirAvaliacao(consultaId: string): Promise<string> {
    const consulta = await repo.findById(consultaId);
    if (!consulta) {
      throw new Error("Avaliação não encontrada.");
    }
    await repo.delete(consultaId);
    return consulta.patient_id;
  };
}
