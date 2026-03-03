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
import { isConsultaComResultado } from "./types";
import { ITENS_CLINICOS, PILARES, SCORE_CLINICO_MAX, PILARES_FULL_MARK } from "./constants";

// Fronteiras de classificação clínica (score 0–42)
const CLINICO_BOUNDARIES = {
  ESTAVEL: 7,
  LEVE: 17,
  MODERADO: 28,
} as const;

// Fronteiras de classificação estrutural (média 0–4)
const ESTRUTURAL_BOUNDARIES = {
  COMPROMETIDA: 1.4,
  INSTAVEL: 2.4,
  FUNCIONAL: 3.4,
} as const;

// Thresholds de variação entre consultas
// ≈12% da escala clínica (5/42) e ≈12.5% da escala estrutural (0.5/4)
const VARIACAO_THRESHOLDS = {
  CLINICO: 5,
  ESTRUTURAL: 0.5,
} as const;

/** Soma dos itens C1–C14 (0–42) */
export function calcularScoreClinico(itens: ItensClinicos): number {
  return ITENS_CLINICOS.reduce((acc, { id }) => acc + itens[id], 0);
}

/** Classificação clínica por faixas de score */
export function classificacaoClinica(score: number): ClassificacaoClinica {
  if (!Number.isFinite(score) || score < 0 || score > SCORE_CLINICO_MAX) {
    throw new Error(`Score clínico inválido: ${score}`);
  }
  if (score <= CLINICO_BOUNDARIES.ESTAVEL) return "CLINICO_ESTAVEL";
  if (score <= CLINICO_BOUNDARIES.LEVE) return "CLINICO_LEVE";
  if (score <= CLINICO_BOUNDARIES.MODERADO) return "CLINICO_MODERADO";
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
  if (!Number.isFinite(media) || media < 0 || media > PILARES_FULL_MARK) {
    throw new Error(`Média estrutural inválida: ${media}`);
  }
  // Normalizar antes de comparar para evitar imprecisão de floating-point
  const m = Math.round(media * 100) / 100;
  if (m <= ESTRUTURAL_BOUNDARIES.COMPROMETIDA) return "ESTRUTURA_COMPROMETIDA";
  if (m <= ESTRUTURAL_BOUNDARIES.INSTAVEL) return "ESTRUTURA_INSTAVEL";
  if (m <= ESTRUTURAL_BOUNDARIES.FUNCIONAL) return "ESTRUTURA_FUNCIONAL";
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
  if (deltaClinico <= -VARIACAO_THRESHOLDS.CLINICO) return "MELHORA_RELEVANTE";
  if (deltaClinico >= VARIACAO_THRESHOLDS.CLINICO) return "PIORA_RELEVANTE";
  return "ESTAVEL";
}

/** Classificação da variação estrutural (quanto maior melhor) */
export function variacaoEstrutura(deltaEstrutura: number): VariacaoComparacao {
  if (deltaEstrutura >= VARIACAO_THRESHOLDS.ESTRUTURAL) return "MELHORA_RELEVANTE";
  if (deltaEstrutura <= -VARIACAO_THRESHOLDS.ESTRUTURAL) return "PIORA_RELEVANTE";
  return "ESTAVEL";
}

/** Comparação com última consulta: deltas, variações e pilares maior melhora/piora */
export function compararComUltima(
  atual: Consulta,
  anterior: Consulta
): ComparacaoResultado | null {
  if (!isConsultaComResultado(atual) || !isConsultaComResultado(anterior)) {
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
