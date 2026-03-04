import { describe, it, expect, vi } from "vitest";
import { createAtualizarPaciente } from "./AtualizarPaciente";
import type { Paciente } from "@/src/domain";

function createMockRepo(overrides: Partial<{
  findById: ReturnType<typeof vi.fn>;
  findByIdentificador: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    findById: vi.fn(),
    findByIdentificador: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    listarTodos: vi.fn(),
    listarPaginado: vi.fn(),
    ...overrides,
  };
}

describe("AtualizarPaciente", () => {
  it("lança erro quando paciente não existe", async () => {
    const repo = createMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const atualizar = createAtualizarPaciente(repo as never);

    await expect(
      atualizar("id-inexistente", { nome: "João", identificador: "123" })
    ).rejects.toThrow("Paciente não encontrado.");

    expect(repo.save).not.toHaveBeenCalled();
  });

  it("lança erro quando nome ou identificador vazios", async () => {
    const repo = createMockRepo({
      findById: vi.fn().mockResolvedValue({ id: "p1", nome: "A", identificador: "x" }),
    });
    const atualizar = createAtualizarPaciente(repo as never);

    await expect(
      atualizar("p1", { nome: "", identificador: "123" })
    ).rejects.toThrow("obrigatórios");
    await expect(
      atualizar("p1", { nome: "João", identificador: "  " })
    ).rejects.toThrow("obrigatórios");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("lança erro quando novo identificador já pertence a outro paciente", async () => {
    const pacienteAtual: Paciente = { id: "p1", nome: "João", identificador: "pront-1" };
    const outroPaciente: Paciente = { id: "p2", nome: "Maria", identificador: "pront-2" };
    const repo = createMockRepo({
      findById: vi.fn().mockResolvedValue(pacienteAtual),
      findByIdentificador: vi.fn().mockResolvedValue(outroPaciente),
    });
    const atualizar = createAtualizarPaciente(repo as never);

    await expect(
      atualizar("p1", { nome: "João", identificador: "pront-2" })
    ).rejects.toThrow("Identificador já utilizado por outro paciente.");

    expect(repo.findByIdentificador).toHaveBeenCalledWith("pront-2");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("atualiza com sucesso sem alterar identificador", async () => {
    const paciente: Paciente = { id: "p1", nome: "João", identificador: "pront-1" };
    const repo = createMockRepo({
      findById: vi.fn().mockResolvedValue(paciente),
    });
    const atualizar = createAtualizarPaciente(repo as never);

    await atualizar("p1", { nome: "João da Silva", identificador: "pront-1" });

    expect(repo.findByIdentificador).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith({
      id: "p1",
      nome: "João da Silva",
      identificador: "pront-1",
    });
  });

  it("atualiza com sucesso alterando identificador para valor não usado", async () => {
    const paciente: Paciente = { id: "p1", nome: "João", identificador: "pront-1" };
    const repo = createMockRepo({
      findById: vi.fn().mockResolvedValue(paciente),
      findByIdentificador: vi.fn().mockResolvedValue(null),
    });
    const atualizar = createAtualizarPaciente(repo as never);

    await atualizar("p1", { nome: "João", identificador: "pront-999" });

    expect(repo.findByIdentificador).toHaveBeenCalledWith("pront-999");
    expect(repo.save).toHaveBeenCalledWith({
      id: "p1",
      nome: "João",
      identificador: "pront-999",
    });
  });

  it("permite manter o mesmo paciente quando identificador não mudou (case insensitive)", async () => {
    const paciente: Paciente = { id: "p1", nome: "João", identificador: "PRONT-1" };
    const repo = createMockRepo({
      findById: vi.fn().mockResolvedValue(paciente),
      findByIdentificador: vi.fn().mockResolvedValue(paciente),
    });
    const atualizar = createAtualizarPaciente(repo as never);

    await atualizar("p1", { nome: "João Silva", identificador: "pront-1" });

    expect(repo.save).toHaveBeenCalledWith({
      id: "p1",
      nome: "João Silva",
      identificador: "pront-1",
    });
  });
});
