import type { ConsultaRepository } from "../ports";
import type { ItensClinicos, ClinicoResultado } from "@/src/domain";
import {
  calcularScoreClinico,
  classificacaoClinica,
  alertaIdeacao,
} from "@/src/domain/calculos";

export function createSalvarFormularioClinico(repo: ConsultaRepository) {
  return async function salvarFormularioClinico(
    consultaId: string,
    itens: ItensClinicos
  ): Promise<void> {
    const consulta = await repo.findById(consultaId);
    if (!consulta) throw new Error("Consulta não encontrada.");
    const score_total = calcularScoreClinico(itens);
    const c14 = itens.C14;
    const clinico: ClinicoResultado = {
      itens,
      score_total,
      classificacao: classificacaoClinica(score_total),
      alerta_ideacao: alertaIdeacao(c14),
    };
    await repo.save({ ...consulta, clinico });
  };
}
