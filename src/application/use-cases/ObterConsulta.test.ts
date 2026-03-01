import { describe, it, expect, vi } from "vitest";
import { createObterConsulta } from "./ObterConsulta";
import type { Consulta } from "@/src/domain";

describe("ObterConsulta", () => {
  it("retorna consulta quando encontrada", async () => {
    const consulta: Consulta = {
      id: "consulta-1",
      patient_id: "paciente-1",
      date: "2025-01-15",
    };
    const repo = {
      findById: vi.fn().mockResolvedValue(consulta),
    };
    const obterConsulta = createObterConsulta(repo as never);
    const result = await obterConsulta("consulta-1");
    expect(result).toEqual(consulta);
    expect(repo.findById).toHaveBeenCalledWith("consulta-1");
  });

  it("retorna null quando consulta não existe", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const obterConsulta = createObterConsulta(repo as never);
    const result = await obterConsulta("inexistente");
    expect(result).toBeNull();
    expect(repo.findById).toHaveBeenCalledWith("inexistente");
  });
});
