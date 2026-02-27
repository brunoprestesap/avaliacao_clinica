/** Escala clínica 0-3 */
export type ValorEscalaClinica = 0 | 1 | 2 | 3;

/** Escala estrutural 0-4 */
export type ValorEscalaEstrutural = 0 | 1 | 2 | 3 | 4;

/** IDs dos itens clínicos C1-C14 */
export type ItemClinicoId =
  | "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8" | "C9"
  | "C10" | "C11" | "C12" | "C13" | "C14";

/** IDs dos pilares P1-P9 */
export type PilarId =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8" | "P9";

export type ClassificacaoClinica =
  | "CLINICO_ESTAVEL"
  | "CLINICO_LEVE"
  | "CLINICO_MODERADO"
  | "CLINICO_GRAVE";

export type ClassificacaoEstrutural =
  | "ESTRUTURA_COMPROMETIDA"
  | "ESTRUTURA_INSTAVEL"
  | "ESTRUTURA_FUNCIONAL"
  | "ESTRUTURA_BEM_ESTRUTURADA";

export type VariacaoComparacao = "MELHORA_RELEVANTE" | "ESTAVEL" | "PIORA_RELEVANTE";

export type FaseIndicada = 1 | 2 | 3 | 4;

export interface ItensClinicos {
  C1: ValorEscalaClinica;
  C2: ValorEscalaClinica;
  C3: ValorEscalaClinica;
  C4: ValorEscalaClinica;
  C5: ValorEscalaClinica;
  C6: ValorEscalaClinica;
  C7: ValorEscalaClinica;
  C8: ValorEscalaClinica;
  C9: ValorEscalaClinica;
  C10: ValorEscalaClinica;
  C11: ValorEscalaClinica;
  C12: ValorEscalaClinica;
  C13: ValorEscalaClinica;
  C14: ValorEscalaClinica;
}

export interface PilaresEstruturais {
  P1: ValorEscalaEstrutural;
  P2: ValorEscalaEstrutural;
  P3: ValorEscalaEstrutural;
  P4: ValorEscalaEstrutural;
  P5: ValorEscalaEstrutural;
  P6: ValorEscalaEstrutural;
  P7: ValorEscalaEstrutural;
  P8: ValorEscalaEstrutural;
  P9: ValorEscalaEstrutural;
}

export interface ClinicoResultado {
  itens: ItensClinicos;
  score_total: number;
  classificacao: ClassificacaoClinica;
  alerta_ideacao: boolean;
}

export interface EstruturaResultado {
  pilares: PilaresEstruturais;
  media: number;
  classificacao: ClassificacaoEstrutural;
}

export interface ComparacaoResultado {
  delta_clinico: number;
  delta_estrutura: number;
  variacao_clinica: VariacaoComparacao;
  variacao_estrutura: VariacaoComparacao;
  pilar_maior_melhora: { pilar: PilarId; label: string; delta: number } | null;
  pilar_maior_piora: { pilar: PilarId; label: string; delta: number } | null;
}

export interface Consulta {
  id: string;
  patient_id: string;
  date: string; // ISO date
  clinico?: ClinicoResultado;
  estrutura?: EstruturaResultado;
  fase_indicada?: FaseIndicada;
  impressao_clinica?: string;
  comparacao?: ComparacaoResultado;
}

export interface Paciente {
  id: string;
  nome: string;
  identificador: string; // prontuário ou CPF
}
