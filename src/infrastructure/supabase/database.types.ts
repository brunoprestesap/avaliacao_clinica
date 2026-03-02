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
  user_id: string | null;
}

export interface ProfileRow {
  user_id: string;
  unlock_password_hash: string;
  unlock_password_salt: string;
}

export interface Database {
  public: {
    Tables: {
      consultas: { Row: ConsultaRow; Insert: ConsultaRow; Update: Partial<ConsultaRow> };
      pacientes: { Row: PacienteRow; Insert: PacienteRow; Update: Partial<PacienteRow> };
      profiles: { Row: ProfileRow; Insert: ProfileRow; Update: Partial<ProfileRow> };
    };
  };
}
