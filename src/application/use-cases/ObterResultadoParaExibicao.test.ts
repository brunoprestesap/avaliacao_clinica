import { describe, it, expect, vi } from "vitest";
import { createObterResultadoParaExibicao } from "./ObterResultadoParaExibicao";
import type { Consulta } from "@/src/domain";

function consultaCompleta(overrides: Partial<Consulta> = {}): Consulta {
  return {
    id: "c1",
    patient_id: "p1",
    date: "2025-01-15",
    fase_indicada: "Núcleo",
    clinico: {
      itens: {
        C1: 1, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, C7: 0, C8: 0, C9: 0,
        C10: 0, C11: 0, C12: 0, C13: 0, C14: 0,
      },
      score_total: 10,
      classificacao: "CLINICO_LEVE",
      alerta_ideacao: false,
    },
    estrutura: {
      pilares: { P1: 2, P2: 2, P3: 2, P4: 2, P5: 2, P6: 2, P7: 2, P8: 2, P9: 2 },
      media: 2,
      classificacao: "ESTRUTURA_INSTAVEL",
    },
    ...overrides,
  };
}

describe("ObterResultadoParaExibicao", () => {
  it("retorna DTO quando consulta tem clinico, estrutura e fase_indicada", async () => {
    const consulta = consultaCompleta();
    const repo = { findById: vi.fn().mockResolvedValue(consulta) };
    const obter = createObterResultadoParaExibicao(repo as never);
    const result = await obter("c1");
    expect(result).not.toBeNull();
    expect(result!.consulta).toEqual(consulta);
    expect(result!.clinico_normalizado_radar).toBeGreaterThanOrEqual(0);
    expect(result!.radar_pilares).toHaveLength(9);
    expect(result!.radar_combinado).toHaveLength(10);
    expect(result!.radar_combinado![0]).toMatchObject({ subject: "Clínico" });
  });

  it("retorna null quando consulta não existe", async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null) };
    const obter = createObterResultadoParaExibicao(repo as never);
    const result = await obter("inexistente");
    expect(result).toBeNull();
  });

  it("retorna null quando consulta não tem clinico", async () => {
    const consulta = consultaCompleta({ clinico: undefined });
    const repo = { findById: vi.fn().mockResolvedValue(consulta) };
    const obter = createObterResultadoParaExibicao(repo as never);
    const result = await obter("c1");
    expect(result).toBeNull();
  });

  it("retorna null quando consulta não tem estrutura", async () => {
    const consulta = consultaCompleta({ estrutura: undefined });
    const repo = { findById: vi.fn().mockResolvedValue(consulta) };
    const obter = createObterResultadoParaExibicao(repo as never);
    const result = await obter("c1");
    expect(result).toBeNull();
  });

  it("retorna null quando consulta não tem fase_indicada", async () => {
    const consulta = consultaCompleta({ fase_indicada: undefined });
    const repo = { findById: vi.fn().mockResolvedValue(consulta) };
    const obter = createObterResultadoParaExibicao(repo as never);
    const result = await obter("c1");
    expect(result).toBeNull();
  });
});
