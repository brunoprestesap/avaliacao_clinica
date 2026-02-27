import type { ConsultaRepository } from "../ports";
import type { Consulta } from "@/src/domain";
import {
  indicarFase,
  compararComUltima,
  clinicoNormalizadoParaRadar,
} from "@/src/domain/calculos";
import { PILARES } from "@/src/domain/constants";

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
    if (!consulta?.clinico || !consulta?.estrutura || !consulta.impressao_clinica) {
      return null;
    }
    const fase = indicarFase(
      consulta.clinico.score_total,
      consulta.estrutura.media,
      consulta.clinico.alerta_ideacao
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

    const clinico_normalizado_radar = clinicoNormalizadoParaRadar(consulta.clinico.score_total);
    const radar_pilares = PILARES.map(({ id, label }) => ({
      subject: label,
      value: consulta.estrutura!.pilares[id],
      fullMark: 4,
    }));
    const radar_combinado = [
      { subject: "Clínico", value: clinico_normalizado_radar, fullMark: 4 },
      ...PILARES.map(({ id, label }) => ({
        subject: label,
        value: consulta.estrutura!.pilares[id],
        fullMark: 4,
      })),
    ];

    return {
      consulta: comComparacao,
      clinico_normalizado_radar,
      radar_pilares,
      radar_combinado,
    };
  };
}
