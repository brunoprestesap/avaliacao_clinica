import type { ConsultaRepository } from "../ports";
import type { Consulta } from "@/src/domain";
import {
  calcularFase,
  compararComUltima,
  clinicoNormalizadoParaRadar,
  buildRadarPilares,
} from "@/src/domain/calculos";
import { PILARES_FULL_MARK } from "@/src/domain/constants";

export interface ResultadoCompletoDTO {
  consulta: Consulta;
  clinico_normalizado_radar: number;
  radar_pilares: { subject: string; value: number; fullMark: number }[];
  radar_combinado: { subject: string; value: number; fullMark: number }[];
}

export function createCalcularResultadoCompleto(repo: ConsultaRepository) {
  return async function calcularResultadoCompleto(
    consultaId: string
  ): Promise<ResultadoCompletoDTO | null> {
    const consulta = await repo.findById(consultaId);
    if (!consulta?.clinico || !consulta?.estrutura) {
      return null;
    }
    const ideacao = consulta.clinico.itens.C14;
    const fase = calcularFase(
      consulta.clinico.score_total,
      consulta.estrutura.media,
      ideacao
    );
    const consultaComFase: Consulta = { ...consulta, fase_indicada: fase };

    const anterior = await repo.getUltimaConsultaAntesDe(consulta.patient_id, consulta.date);
    let comComparacao: Consulta = consultaComFase;
    if (anterior) {
      const comparacao = compararComUltima(consultaComFase, anterior);
      if (comparacao) {
        comComparacao = { ...consultaComFase, comparacao };
      }
    }
    await repo.save(comComparacao);

    const { estrutura } = consulta;
    const clinico_normalizado_radar = clinicoNormalizadoParaRadar(consulta.clinico.score_total);
    const radar_pilares = buildRadarPilares(estrutura.pilares);
    const radar_combinado = [
      { subject: "Clínico", value: clinico_normalizado_radar, fullMark: PILARES_FULL_MARK },
      ...radar_pilares,
    ];

    return {
      consulta: comComparacao,
      clinico_normalizado_radar,
      radar_pilares,
      radar_combinado,
    };
  };
}
