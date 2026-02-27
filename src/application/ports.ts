import type { Consulta, Paciente } from "@/src/domain";

export interface ConsultaRepository {
  save(consulta: Consulta): Promise<void>;
  findById(id: string): Promise<Consulta | null>;
  findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]>;
  getUltimaConsultaAntesDe(patientId: string, date: string): Promise<Consulta | null>;
}

export interface PacienteRepository {
  save(paciente: Paciente): Promise<void>;
  findById(id: string): Promise<Paciente | null>;
  findByIdentificador(identificador: string): Promise<Paciente | null>;
  listarTodos(): Promise<Paciente[]>;
}
