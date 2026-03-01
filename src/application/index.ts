export type {
  ConsultaRepository,
  PacienteRepository,
  AvaliacaoUseCases,
  ListarPacientesInput,
  ListarPacientesResult,
} from "./ports";

export type { ResultadoCompletoDTO } from "./use-cases/CalcularResultadoCompleto";
export type {
  IdentificarPacienteInput,
  IdentificarPacienteResult,
} from "./use-cases/IdentificarPaciente";

export type {
  Consulta,
  Paciente,
  ItensClinicos,
  PilaresEstruturais,
  ItemClinicoId,
  PilarId,
} from "@/src/domain";
export {
  ITENS_CLINICOS,
  PILARES,
  INSTRUCAO_CLINICA,
  INSTRUCAO_PILARES,
  CLASSIFICACAO_CLINICA_LABELS,
  CLASSIFICACAO_ESTRUTURA_LABELS,
  VARIACAO_LABELS,
  PILARES_FULL_MARK,
  ESCALA_CLINICA_LABELS,
  ESCALA_ESTRUTURAL_LABELS,
} from "@/src/domain/constants";
