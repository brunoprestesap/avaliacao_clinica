import type { PacienteRepository } from "../ports";

export function createAtualizarPaciente(repo: PacienteRepository) {
  return async function atualizarPaciente(
    patientId: string,
    data: { nome: string; identificador: string }
  ): Promise<void> {
    const nome = data.nome.trim();
    const identificador = data.identificador.trim();
    if (!nome || !identificador) {
      throw new Error("Nome e identificador são obrigatórios.");
    }

    const paciente = await repo.findById(patientId);
    if (!paciente) {
      throw new Error("Paciente não encontrado.");
    }

    const identificadorAlterado =
      identificador.toLowerCase() !== paciente.identificador.toLowerCase();
    if (identificadorAlterado) {
      const existente = await repo.findByIdentificador(identificador);
      if (existente && existente.id !== patientId) {
        throw new Error("Identificador já utilizado por outro paciente.");
      }
    }

    await repo.save({
      id: patientId,
      nome,
      identificador,
    });
  };
}
