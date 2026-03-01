import type { PacienteRepository } from "../ports";
import type { Paciente } from "@/src/domain";

export interface IdentificarPacienteInput {
  nome: string;
  identificador: string;
  /** Id do usuário autenticado (obrigatório com Supabase/RLS para novos pacientes). */
  userId?: string;
}

export interface IdentificarPacienteResult {
  paciente: Paciente;
  criado: boolean;
}

export function createIdentificarPaciente(repo: PacienteRepository) {
  return async function identificarPaciente(
    input: IdentificarPacienteInput
  ): Promise<IdentificarPacienteResult> {
    const identificador = input.identificador.trim();
    const nome = input.nome.trim();
    if (!identificador || !nome) {
      throw new Error("Nome e identificador são obrigatórios.");
    }
    const existente = await repo.findByIdentificador(identificador);
    if (existente) {
      return { paciente: existente, criado: false };
    }
    const paciente: Paciente = {
      id: crypto.randomUUID(),
      nome,
      identificador,
    };
    await repo.save(paciente, input.userId);
    return { paciente, criado: true };
  };
}
