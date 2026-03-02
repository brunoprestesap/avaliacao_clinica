import { describe, it, expect, vi } from "vitest";
import { createIniciarNovaConsulta } from "./IniciarNovaConsulta";

describe("IniciarNovaConsulta", () => {
  it("salva consulta e retorna id", async () => {
    const repo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByPatientIdOrderByDate: vi.fn(),
      getUltimaConsultaAntesDe: vi.fn(),
      delete: vi.fn(),
    };
    const iniciar = createIniciarNovaConsulta(repo as never);

    const id = await iniciar("patient-1");

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(repo.save).toHaveBeenCalledTimes(1);
    const [consulta] = vi.mocked(repo.save).mock.calls[0];
    expect(consulta.patient_id).toBe("patient-1");
    expect(consulta.id).toBe(id);
    expect(consulta.date).toBeDefined();
  });

  it("lança erro quando patientId vazio", async () => {
    const repo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByPatientIdOrderByDate: vi.fn(),
      getUltimaConsultaAntesDe: vi.fn(),
      delete: vi.fn(),
    };
    const iniciar = createIniciarNovaConsulta(repo as never);

    await expect(iniciar("")).rejects.toThrow("obrigatório");
    await expect(iniciar("   ")).rejects.toThrow("obrigatório");
  });
});
