import type { ClinicoResultado, ComparacaoResultado, EstruturaResultado } from "@/src/domain";

export interface ConsultaRow {
  id: string;
  patient_id: string;
  date: string;
  clinico: ClinicoResultado | null;
  estrutura: EstruturaResultado | null;
  fase_indicada: string | null;
  impressao_clinica: string | null;
  comparacao: ComparacaoResultado | null;
}

export interface PacienteRow {
  id: string;
  nome: string;
  identificador: string;
}

export interface Database {
  public: {
    Tables: {
      consultas: { Row: ConsultaRow; Insert: ConsultaRow; Update: Partial<ConsultaRow> };
      pacientes: { Row: PacienteRow; Insert: PacienteRow; Update: Partial<PacienteRow> };
    };
  };
}
