import type { ConsultaRepository } from "../ports";
import type { Consulta } from "@/src/domain";
import { clinicoNormalizadoParaRadar, buildRadarPilares } from "@/src/domain/calculos";
import { PILARES_FULL_MARK } from "@/src/domain/constants";
import type { ResultadoCompletoDTO } from "./CalcularResultadoCompleto";

export function createObterResultadoParaExibicao(repo: ConsultaRepository) {
  return async function obterResultadoParaExibicao(
    consultaId: string
  ): Promise<ResultadoCompletoDTO | null> {
    const consulta = await repo.findById(consultaId);
    if (!consulta?.clinico || !consulta?.estrutura || !consulta?.fase_indicada) {
      return null;
    }
    const clinico_normalizado_radar = clinicoNormalizadoParaRadar(consulta.clinico.score_total);
    const radar_pilares = buildRadarPilares(consulta.estrutura.pilares);
    const radar_combinado = [
      { subject: "Clínico", value: clinico_normalizado_radar, fullMark: PILARES_FULL_MARK },
      ...radar_pilares,
    ];
    return {
      consulta,
      clinico_normalizado_radar,
      radar_pilares,
      radar_combinado,
    };
  };
}
