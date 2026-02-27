import type { ConsultaRepository } from "../ports";
import type { PilaresEstruturais, EstruturaResultado } from "@/src/domain";
import {
  calcularMediaEstrutural,
  classificacaoEstrutural,
} from "@/src/domain/calculos";

export function createSalvarPilaresEstruturais(repo: ConsultaRepository) {
  return async function salvarPilaresEstruturais(
    consultaId: string,
    pilares: PilaresEstruturais
  ): Promise<void> {
    const consulta = await repo.findById(consultaId);
    if (!consulta) throw new Error("Consulta não encontrada.");
    const media = calcularMediaEstrutural(pilares);
    const estrutura: EstruturaResultado = {
      pilares,
      media,
      classificacao: classificacaoEstrutural(media),
    };
    await repo.save({ ...consulta, estrutura });
  };
}
