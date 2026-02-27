import type { ConsultaRepository } from "../ports";

export function createSalvarImpressaoClinica(repo: ConsultaRepository) {
  return async function salvarImpressaoClinica(
    consultaId: string,
    impressaoClinica: string
  ): Promise<void> {
    const texto = impressaoClinica?.trim();
    if (!texto) throw new Error("Impressão clínica é obrigatória.");
    const consulta = await repo.findById(consultaId);
    if (!consulta) throw new Error("Consulta não encontrada.");
    await repo.save({ ...consulta, impressao_clinica: texto });
  };
}
