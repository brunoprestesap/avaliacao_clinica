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
    try {
      await repo.save(paciente, input.userId);
      return { paciente, criado: true };
    } catch {
      // Falha ao salvar — pode ser race condition com requisição concorrente.
      // Tenta buscar o paciente que pode ter sido criado pelo outro request.
      const existenteApos = await repo.findByIdentificador(identificador);
      if (existenteApos) return { paciente: existenteApos, criado: false };
      throw new Error("Erro ao criar paciente. Tente novamente.");
    }
  };
}
