import type { ConsultaRepository } from "../ports";
import type { Consulta } from "@/src/domain";
import { isConsultaFinalizada } from "@/src/domain/types";
import {
  clinicoNormalizadoParaRadar,
  buildRadarPilares,
  compararComUltima,
} from "@/src/domain/calculos";
import { PILARES_FULL_MARK } from "@/src/domain/constants";
import type { ResultadoCompletoDTO } from "./CalcularResultadoCompleto";

export function createObterResultadoParaExibicao(repo: ConsultaRepository) {
  return async function obterResultadoParaExibicao(
    consultaId: string
  ): Promise<ResultadoCompletoDTO | null> {
    const consulta = await repo.findById(consultaId);
    if (!consulta || !isConsultaFinalizada(consulta)) {
      return null;
    }
    let consultaParaExibir: Consulta = consulta;
    let anterior: Consulta | null = null;
    if (consulta.patient_id) {
      anterior = await repo.getUltimaConsultaAntesDe(consulta.patient_id, consulta.id);
      if (anterior && !consulta.comparacao) {
        const comparacao = compararComUltima(consulta, anterior);
        if (comparacao) {
          consultaParaExibir = { ...consulta, comparacao };
        }
      }
    }
    const clinico_normalizado_radar = clinicoNormalizadoParaRadar(consulta.clinico.score_total);
    const pilaresAtual = buildRadarPilares(consulta.estrutura.pilares);
    const radar_pilares =
      anterior?.estrutura?.pilares
        ? pilaresAtual.map((p, i) => {
            const pilaresAnterior = buildRadarPilares(anterior!.estrutura!.pilares);
            return { ...p, value_anterior: pilaresAnterior[i]?.value };
          })
        : pilaresAtual;
    const radar_combinado = [
      { subject: "Clínico", value: clinico_normalizado_radar, fullMark: PILARES_FULL_MARK },
      ...radar_pilares,
    ];
    return {
      consulta: consultaParaExibir,
      clinico_normalizado_radar,
      radar_pilares,
      radar_combinado,
    };
  };
}
