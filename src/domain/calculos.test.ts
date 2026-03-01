import { describe, it, expect } from "vitest";
import {
  calcularScoreClinico,
  classificacaoClinica,
  alertaIdeacao,
  calcularMediaEstrutural,
  classificacaoEstrutural,
  calcularFase,
  clinicoNormalizadoParaRadar,
  buildRadarPilares,
  variacaoClinica,
  variacaoEstrutura,
  compararComUltima,
} from "./calculos";
import type { ItensClinicos, PilaresEstruturais, Consulta } from "./types";

function itensClinicos(values: number[]): ItensClinicos {
  const ids = ["C1","C2","C3","C4","C5","C6","C7","C8","C9","C10","C11","C12","C13","C14"] as const;
  const out = {} as ItensClinicos;
  ids.forEach((id, i) => { out[id] = (values[i] ?? 0) as 0|1|2|3; });
  return out;
}

function pilares(values: number[]): PilaresEstruturais {
  const ids = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"] as const;
  const out = {} as PilaresEstruturais;
  ids.forEach((id, i) => { out[id] = (values[i] ?? 0) as 0|1|2|3|4; });
  return out;
}

describe("calcularScoreClinico", () => {
  it("soma todos os itens (0-42)", () => {
    expect(calcularScoreClinico(itensClinicos([0,0,0,0,0,0,0,0,0,0,0,0,0,0]))).toBe(0);
    expect(calcularScoreClinico(itensClinicos([3,3,3,3,3,3,3,3,3,3,3,3,3,3]))).toBe(42);
    expect(calcularScoreClinico(itensClinicos([1,1,1,1,1,1,1,1,1,1,1,1,1,1]))).toBe(14);
  });
});

describe("classificacaoClinica", () => {
  it("retorna CLINICO_ESTAVEL para 0-7", () => {
    expect(classificacaoClinica(0)).toBe("CLINICO_ESTAVEL");
    expect(classificacaoClinica(7)).toBe("CLINICO_ESTAVEL");
  });
  it("retorna CLINICO_LEVE para 8-17", () => {
    expect(classificacaoClinica(8)).toBe("CLINICO_LEVE");
    expect(classificacaoClinica(17)).toBe("CLINICO_LEVE");
  });
  it("retorna CLINICO_MODERADO para 18-28", () => {
    expect(classificacaoClinica(18)).toBe("CLINICO_MODERADO");
    expect(classificacaoClinica(28)).toBe("CLINICO_MODERADO");
  });
  it("retorna CLINICO_GRAVE para 29-42", () => {
    expect(classificacaoClinica(29)).toBe("CLINICO_GRAVE");
    expect(classificacaoClinica(42)).toBe("CLINICO_GRAVE");
  });
});

describe("alertaIdeacao", () => {
  it("retorna true quando C14 >= 2", () => {
    expect(alertaIdeacao(2)).toBe(true);
    expect(alertaIdeacao(3)).toBe(true);
  });
  it("retorna false quando C14 < 2", () => {
    expect(alertaIdeacao(0)).toBe(false);
    expect(alertaIdeacao(1)).toBe(false);
  });
});

describe("calcularMediaEstrutural", () => {
  it("calcula média com 2 decimais", () => {
    expect(calcularMediaEstrutural(pilares([0,0,0,0,0,0,0,0,0]))).toBe(0);
    expect(calcularMediaEstrutural(pilares([4,4,4,4,4,4,4,4,4]))).toBe(4);
    expect(calcularMediaEstrutural(pilares([2,2,2,2,2,2,2,2,2]))).toBe(2);
    expect(calcularMediaEstrutural(pilares([1,2,3,2,2,2,2,2,2]))).toBe(2);
  });
});

describe("classificacaoEstrutural", () => {
  it("retorna ESTRUTURA_COMPROMETIDA para 0-1.4", () => {
    expect(classificacaoEstrutural(0)).toBe("ESTRUTURA_COMPROMETIDA");
    expect(classificacaoEstrutural(1.4)).toBe("ESTRUTURA_COMPROMETIDA");
  });
  it("retorna ESTRUTURA_INSTAVEL para 1.5-2.4", () => {
    expect(classificacaoEstrutural(1.5)).toBe("ESTRUTURA_INSTAVEL");
    expect(classificacaoEstrutural(2.4)).toBe("ESTRUTURA_INSTAVEL");
  });
  it("retorna ESTRUTURA_FUNCIONAL para 2.5-3.4", () => {
    expect(classificacaoEstrutural(2.5)).toBe("ESTRUTURA_FUNCIONAL");
    expect(classificacaoEstrutural(3.4)).toBe("ESTRUTURA_FUNCIONAL");
  });
  it("retorna ESTRUTURA_BEM_ESTRUTURADA para 3.5-4", () => {
    expect(classificacaoEstrutural(3.5)).toBe("ESTRUTURA_BEM_ESTRUTURADA");
    expect(classificacaoEstrutural(4)).toBe("ESTRUTURA_BEM_ESTRUTURADA");
  });
});

describe("calcularFase", () => {
  it("retorna Integral se ideação >= 2", () => {
    expect(calcularFase(0, 4, 2)).toBe("Integral");
    expect(calcularFase(8, 3, 3)).toBe("Integral");
  });
  it("retorna Integral se score >= 29", () => {
    expect(calcularFase(29, 1, 0)).toBe("Integral");
    expect(calcularFase(42, 2, 0)).toBe("Integral");
  });
  it("retorna Integral se score >= 21 e estrutura <= 2.5", () => {
    expect(calcularFase(21, 2.5, 0)).toBe("Integral");
    expect(calcularFase(28, 2, 0)).toBe("Integral");
  });
  it("retorna Núcleo se score >= 11 ou estrutura < 2.5", () => {
    expect(calcularFase(11, 3, 0)).toBe("Núcleo");
    expect(calcularFase(15, 2.4, 0)).toBe("Núcleo");
    expect(calcularFase(10, 2.4, 0)).toBe("Núcleo");
  });
  it("retorna Essência quando score < 11 e estrutura >= 2.5", () => {
    expect(calcularFase(0, 2.5, 0)).toBe("Essência");
    expect(calcularFase(10, 3, 0)).toBe("Essência");
    expect(calcularFase(7, 4, 0)).toBe("Essência");
  });
});

describe("clinicoNormalizadoParaRadar", () => {
  it("converte 0-42 para 0-4", () => {
    expect(clinicoNormalizadoParaRadar(0)).toBe(0);
    expect(clinicoNormalizadoParaRadar(42)).toBe(4);
    expect(clinicoNormalizadoParaRadar(21)).toBe(2);
  });
});

describe("buildRadarPilares", () => {
  it("retorna 9 itens com subject, value, fullMark", () => {
    const p = pilares([1, 2, 3, 2, 2, 2, 2, 2, 2]);
    const result = buildRadarPilares(p);
    expect(result).toHaveLength(9);
    expect(result[0]).toEqual({ subject: "Sono", value: 1, fullMark: 4 });
    expect(result.every((r) => r.fullMark === 4)).toBe(true);
  });
});

describe("variacaoClinica", () => {
  it("MELHORA_RELEVANTE quando delta <= -5", () => {
    expect(variacaoClinica(-5)).toBe("MELHORA_RELEVANTE");
    expect(variacaoClinica(-10)).toBe("MELHORA_RELEVANTE");
  });
  it("PIORA_RELEVANTE quando delta >= 5", () => {
    expect(variacaoClinica(5)).toBe("PIORA_RELEVANTE");
    expect(variacaoClinica(10)).toBe("PIORA_RELEVANTE");
  });
  it("ESTAVEL entre -4 e +4", () => {
    expect(variacaoClinica(-4)).toBe("ESTAVEL");
    expect(variacaoClinica(0)).toBe("ESTAVEL");
    expect(variacaoClinica(4)).toBe("ESTAVEL");
  });
});

describe("variacaoEstrutura", () => {
  it("MELHORA_RELEVANTE quando delta >= 0.5", () => {
    expect(variacaoEstrutura(0.5)).toBe("MELHORA_RELEVANTE");
    expect(variacaoEstrutura(1)).toBe("MELHORA_RELEVANTE");
  });
  it("PIORA_RELEVANTE quando delta <= -0.5", () => {
    expect(variacaoEstrutura(-0.5)).toBe("PIORA_RELEVANTE");
    expect(variacaoEstrutura(-1)).toBe("PIORA_RELEVANTE");
  });
  it("ESTAVEL entre -0.4 e +0.4", () => {
    expect(variacaoEstrutura(-0.4)).toBe("ESTAVEL");
    expect(variacaoEstrutura(0)).toBe("ESTAVEL");
    expect(variacaoEstrutura(0.4)).toBe("ESTAVEL");
  });
});

describe("compararComUltima", () => {
  it("retorna null se faltar clinico ou estrutura", () => {
    const atual: Consulta = { id: "1", patient_id: "p", date: "2025-01-02" };
    const anterior: Consulta = { id: "2", patient_id: "p", date: "2025-01-01", clinico: { itens: itensClinicos([0,0,0,0,0,0,0,0,0,0,0,0,0,0]), score_total: 0, classificacao: "CLINICO_ESTAVEL", alerta_ideacao: false }, estrutura: { pilares: pilares([2,2,2,2,2,2,2,2,2]), media: 2, classificacao: "ESTRUTURA_INSTAVEL" } };
    expect(compararComUltima(atual, anterior)).toBeNull();
  });
  it("calcula deltas e identifica pilar maior melhora/piora", () => {
    const atual: Consulta = {
      id: "1",
      patient_id: "p",
      date: "2025-01-02",
      clinico: { itens: itensClinicos([1,1,1,1,1,1,1,1,1,1,1,1,1,1]), score_total: 14, classificacao: "CLINICO_LEVE", alerta_ideacao: false },
      estrutura: { pilares: pilares([3,2,2,2,2,2,2,2,1]), media: 2, classificacao: "ESTRUTURA_INSTAVEL" },
    };
    const anterior: Consulta = {
      id: "2",
      patient_id: "p",
      date: "2025-01-01",
      clinico: { itens: itensClinicos([2,2,2,2,2,2,2,2,2,2,2,2,2,2]), score_total: 28, classificacao: "CLINICO_MODERADO", alerta_ideacao: false },
      estrutura: { pilares: pilares([2,2,2,2,2,2,2,2,2]), media: 2, classificacao: "ESTRUTURA_INSTAVEL" },
    };
    const r = compararComUltima(atual, anterior);
    expect(r).not.toBeNull();
    expect(r!.delta_clinico).toBe(14 - 28);
    expect(r!.delta_estrutura).toBe(2 - 2);
    expect(r!.variacao_clinica).toBe("MELHORA_RELEVANTE");
    expect(r!.pilar_maior_melhora?.pilar).toBe("P1");
    expect(r!.pilar_maior_melhora?.delta).toBe(1);
    expect(r!.pilar_maior_piora?.pilar).toBe("P9");
    expect(r!.pilar_maior_piora?.delta).toBe(-1);
  });
});
