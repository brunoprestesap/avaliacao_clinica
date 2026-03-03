import type { ConsultaRepository } from "../ports";
import type { PilaresEstruturais, EstruturaResultado } from "@/src/domain";
import {
  calcularMediaEstrutural,
  classificacaoEstrutural,
} from "@/src/domain/calculos";
import { PILARES } from "@/src/domain/constants";

export function createSalvarPilaresEstruturais(repo: ConsultaRepository) {
  return async function salvarPilaresEstruturais(
    consultaId: string,
    pilares: PilaresEstruturais
  ): Promise<void> {
    for (const { id } of PILARES) {
      const v = pilares[id];
      if (v < 0 || v > 4) throw new Error(`Valor inválido para ${id}: ${v}`);
    }
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
