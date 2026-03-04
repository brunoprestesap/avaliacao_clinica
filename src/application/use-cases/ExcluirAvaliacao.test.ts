import { describe, it, expect, vi } from "vitest";
import { createExcluirAvaliacao } from "./ExcluirAvaliacao";
import type { Consulta } from "@/src/domain";

describe("ExcluirAvaliacao", () => {
  it("lança quando avaliação não existe", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    };
    const excluirAvaliacao = createExcluirAvaliacao(repo as never);
    await expect(excluirAvaliacao("inexistente")).rejects.toThrow("Avaliação não encontrada.");
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("exclui consulta em branco e retorna patient_id", async () => {
    const consulta: Consulta = {
      id: "consulta-1",
      patient_id: "paciente-1",
      date: "2025-01-15",
    };
    const repo = {
      findById: vi.fn().mockResolvedValue(consulta),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const excluirAvaliacao = createExcluirAvaliacao(repo as never);
    const patientId = await excluirAvaliacao("consulta-1");
    expect(patientId).toBe("paciente-1");
    expect(repo.findById).toHaveBeenCalledWith("consulta-1");
    expect(repo.delete).toHaveBeenCalledWith("consulta-1");
  });

  it("exclui consulta com dados clínicos e retorna patient_id", async () => {
    const consulta = {
      id: "consulta-2",
      patient_id: "paciente-2",
      date: "2025-02-20",
      clinico: {
        itens: { C1: 1, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, C7: 0, C8: 0, C9: 0, C10: 0, C11: 0, C12: 0, C13: 0, C14: 0 },
        score_total: 15,
        classificacao: "CLINICO_LEVE" as const,
        alerta_ideacao: false,
      },
    } satisfies Consulta;
    const repo = {
      findById: vi.fn().mockResolvedValue(consulta),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const excluirAvaliacao = createExcluirAvaliacao(repo as never);
    const patientId = await excluirAvaliacao("consulta-2");
    expect(patientId).toBe("paciente-2");
    expect(repo.findById).toHaveBeenCalledWith("consulta-2");
    expect(repo.delete).toHaveBeenCalledWith("consulta-2");
  });
});
