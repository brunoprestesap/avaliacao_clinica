import type {
  ItensClinicos,
  PilaresEstruturais,
  ClassificacaoClinica,
  ClassificacaoEstrutural,
  FaseIndicadaLabel,
  VariacaoComparacao,
  PilarId,
  Consulta,
  ComparacaoResultado,
} from "./types";
import { ITENS_CLINICOS, PILARES, SCORE_CLINICO_MAX, PILARES_FULL_MARK } from "./constants";

/** Soma dos itens C1–C14 (0–42) */
export function calcularScoreClinico(itens: ItensClinicos): number {
  return ITENS_CLINICOS.reduce((acc, { id }) => acc + itens[id], 0);
}

/** Classificação clínica por faixas de score */
export function classificacaoClinica(score: number): ClassificacaoClinica {
  if (score <= 7) return "CLINICO_ESTAVEL";
  if (score <= 17) return "CLINICO_LEVE";
  if (score <= 28) return "CLINICO_MODERADO";
  return "CLINICO_GRAVE";
}

/** Alerta de ideação: C14 >= 2 */
export function alertaIdeacao(valorC14: number): boolean {
  return valorC14 >= 2;
}

/** Média estrutural (P1–P9) / 9, 2 decimais */
export function calcularMediaEstrutural(pilares: PilaresEstruturais): number {
  const soma = PILARES.reduce((acc, { id }) => acc + pilares[id], 0);
  return Math.round((soma / PILARES.length) * 100) / 100;
}

/** Classificação estrutural por faixas de média */
export function classificacaoEstrutural(media: number): ClassificacaoEstrutural {
  if (media <= 1.4) return "ESTRUTURA_COMPROMETIDA";
  if (media <= 2.4) return "ESTRUTURA_INSTAVEL";
  if (media <= 3.4) return "ESTRUTURA_FUNCIONAL";
  return "ESTRUTURA_BEM_ESTRUTURADA";
}

/** Matriz oficial FASE (Integral / Núcleo / Essência); ideacao = valor da pergunta 9 (C14) */
export function calcularFase(
  score: number,
  estrutura: number,
  ideacao: number
): FaseIndicadaLabel {
  if (ideacao >= 2) return "Integral";
  if (score >= 29) return "Integral";
  if (score >= 21 && estrutura <= 2.5) return "Integral";
  if (score >= 11 || estrutura < 2.5) return "Núcleo";
  return "Essência";
}

/** Normalização do score clínico para escala 0–4 (radar combinado) */
export function clinicoNormalizadoParaRadar(scoreClinico: number): number {
  return Math.round((scoreClinico / SCORE_CLINICO_MAX) * PILARES_FULL_MARK * 100) / 100;
}

/** Dados dos 9 pilares para gráfico radar/barras (subject, value, fullMark) */
export function buildRadarPilares(pilares: PilaresEstruturais): { subject: string; value: number; fullMark: number }[] {
  return PILARES.map(({ id, label }) => ({
    subject: label,
    value: pilares[id],
    fullMark: PILARES_FULL_MARK,
  }));
}

/** Classificação da variação clínica (quanto menor melhor) */
export function variacaoClinica(deltaClinico: number): VariacaoComparacao {
  if (deltaClinico <= -5) return "MELHORA_RELEVANTE";
  if (deltaClinico >= 5) return "PIORA_RELEVANTE";
  return "ESTAVEL";
}

/** Classificação da variação estrutural (quanto maior melhor) */
export function variacaoEstrutura(deltaEstrutura: number): VariacaoComparacao {
  if (deltaEstrutura >= 0.5) return "MELHORA_RELEVANTE";
  if (deltaEstrutura <= -0.5) return "PIORA_RELEVANTE";
  return "ESTAVEL";
}

/** Comparação com última consulta: deltas, variações e pilares maior melhora/piora */
export function compararComUltima(
  atual: Consulta,
  anterior: Consulta
): ComparacaoResultado | null {
  if (!atual.clinico || !atual.estrutura || !anterior.clinico || !anterior.estrutura) {
    return null;
  }
  const delta_clinico = atual.clinico.score_total - anterior.clinico.score_total;
  const delta_estrutura = atual.estrutura.media - anterior.estrutura.media;

  let pilar_maior_melhora: { pilar: PilarId; label: string; delta: number } | null = null;
  let pilar_maior_piora: { pilar: PilarId; label: string; delta: number } | null = null;

  for (const { id, label } of PILARES) {
    const delta = atual.estrutura.pilares[id] - anterior.estrutura.pilares[id];
    if (delta > 0) {
      if (!pilar_maior_melhora || delta > pilar_maior_melhora.delta) {
        pilar_maior_melhora = { pilar: id, label, delta };
      }
    } else if (delta < 0) {
      if (!pilar_maior_piora || delta < pilar_maior_piora.delta) {
        pilar_maior_piora = { pilar: id, label, delta };
      }
    }
  }

  return {
    delta_clinico,
    delta_estrutura,
    variacao_clinica: variacaoClinica(delta_clinico),
    variacao_estrutura: variacaoEstrutura(delta_estrutura),
    pilar_maior_melhora,
    pilar_maior_piora,
  };
}
