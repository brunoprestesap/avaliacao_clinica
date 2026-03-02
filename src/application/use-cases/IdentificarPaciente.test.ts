import { describe, it, expect, vi } from "vitest";
import { createIdentificarPaciente } from "./IdentificarPaciente";
import type { Paciente } from "@/src/domain";

describe("IdentificarPaciente", () => {
  it("retorna paciente existente quando identificador já existe", async () => {
    const existente: Paciente = {
      id: "p1",
      nome: "João",
      identificador: "cpf-123",
    };
    const repo = {
      findByIdentificador: vi.fn().mockResolvedValue(existente),
      save: vi.fn(),
      findById: vi.fn(),
      listarTodos: vi.fn(),
      listarPaginado: vi.fn(),
    };
    const identificar = createIdentificarPaciente(repo as never);

    const result = await identificar({
      nome: "João",
      identificador: "cpf-123",
    });

    expect(result).toEqual({ paciente: existente, criado: false });
    expect(repo.findByIdentificador).toHaveBeenCalledWith("cpf-123");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("cria novo paciente e retorna criado: true quando não existe", async () => {
    const repo = {
      findByIdentificador: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      listarTodos: vi.fn(),
      listarPaginado: vi.fn(),
    };
    const identificar = createIdentificarPaciente(repo as never);

    const result = await identificar({
      nome: "Maria",
      identificador: "cpf-456",
    });

    expect(result.criado).toBe(true);
    expect(result.paciente.nome).toBe("Maria");
    expect(result.paciente.identificador).toBe("cpf-456");
    expect(result.paciente.id).toBeDefined();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Maria", identificador: "cpf-456" }),
      undefined
    );
  });

  it("lança erro quando nome ou identificador vazios", async () => {
    const repo = {
      findByIdentificador: vi.fn(),
      save: vi.fn(),
      findById: vi.fn(),
      listarTodos: vi.fn(),
      listarPaginado: vi.fn(),
    };
    const identificar = createIdentificarPaciente(repo as never);

    await expect(
      identificar({ nome: "", identificador: "x" })
    ).rejects.toThrow("obrigatórios");
    await expect(
      identificar({ nome: "A", identificador: "  " })
    ).rejects.toThrow("obrigatórios");
  });
});
