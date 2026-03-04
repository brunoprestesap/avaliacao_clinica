import type { Consulta, Paciente, ItensClinicos, PilaresEstruturais } from "@/src/domain";
import type { ResultadoCompletoDTO } from "./use-cases/CalcularResultadoCompleto";
import type { IdentificarPacienteInput, IdentificarPacienteResult } from "./use-cases/IdentificarPaciente";

export interface ConsultaRepository {
  save(consulta: Consulta): Promise<void>;
  findById(id: string): Promise<Consulta | null>;
  findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]>;
  getUltimaConsultaAntesDe(patientId: string, currentConsultaId: string): Promise<Consulta | null>;
  delete(id: string): Promise<void>;
}

export interface ListarPacientesInput {
  page?: number;
  limit?: number;
  query?: string;
}

export interface ListarPacientesResult {
  pacientes: Paciente[];
  total: number;
  page: number;
  limit: number;
}

export interface PacienteRepository {
  save(paciente: Paciente, ownerId?: string): Promise<void>;
  findById(id: string): Promise<Paciente | null>;
  findByIdentificador(identificador: string): Promise<Paciente | null>;
  listarTodos(): Promise<Paciente[]>;
  listarPaginado(offset: number, limit: number, query?: string): Promise<{ pacientes: Paciente[]; total: number }>;
}

/** Porta de use cases para a camada de apresentação (app). */
export interface AvaliacaoUseCases {
  identificarPaciente(input: IdentificarPacienteInput): Promise<IdentificarPacienteResult>;
  iniciarNovaConsulta(patientId: string): Promise<string>;
  salvarFormularioClinico(consultaId: string, itens: ItensClinicos): Promise<void>;
  salvarPilaresEstruturais(consultaId: string, pilares: PilaresEstruturais): Promise<void>;
  salvarImpressaoClinica(consultaId: string, impressaoClinica: string): Promise<void>;
  calcularResultadoCompleto(consultaId: string): Promise<ResultadoCompletoDTO | null>;
  listarHistoricoPaciente(patientId: string): Promise<Consulta[]>;
  obterConsulta(consultaId: string): Promise<Consulta | null>;
  obterResultadoParaExibicao(consultaId: string): Promise<ResultadoCompletoDTO | null>;
  listarPacientes(opts?: ListarPacientesInput): Promise<ListarPacientesResult>;
  obterPaciente(patientId: string): Promise<Paciente | null>;
  atualizarPaciente(
    patientId: string,
    data: { nome: string; identificador: string }
  ): Promise<void>;
  excluirAvaliacao(consultaId: string): Promise<string>;
}
