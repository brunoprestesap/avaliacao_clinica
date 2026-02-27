import type { ItemClinicoId, PilarId } from "./types";

/** Instrução do formulário clínico (planilha: últimas 2 semanas) */
export const INSTRUCAO_CLINICA =
  "Para responder, considere as últimas 2 semanas.";

/** Instrução do formulário de pilares (planilha: últimas 4 semanas) */
export const INSTRUCAO_PILARES =
  "Para responder, considere as últimas 4 semanas.";

/** Escala clínica 0-3: labels alinhados à planilha Dra. Camila */
export const ESCALA_CLINICA_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: "Não aconteceu",
  1: "Aconteceu poucos dias",
  2: "Aconteceu mais da metade dos dias",
  3: "Aconteceu quase todos os dias ou com intensidade importante",
};

/** Escala estrutural 0-4: labels alinhados à planilha */
export const ESCALA_ESTRUTURAL_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Muito ruim / totalmente desorganizado",
  1: "Ruim",
  2: "Regular",
  3: "Bom",
  4: "Muito bom / bem estruturado",
};

/** Itens clínicos fixos C1-C14 */
export const ITENS_CLINICOS: { id: ItemClinicoId; label: string }[] = [
  { id: "C1", label: "Humor deprimido" },
  { id: "C2", label: "Ansiedade" },
  { id: "C3", label: "Anedonia" },
  { id: "C4", label: "Irritabilidade" },
  { id: "C5", label: "Energia/fadiga" },
  { id: "C6", label: "Concentração" },
  { id: "C7", label: "Sono (qualidade subjetiva)" },
  { id: "C8", label: "Apetite" },
  { id: "C9", label: "Culpa/autocrítica" },
  { id: "C10", label: "Desesperança" },
  { id: "C11", label: "Agitação ou lentificação" },
  { id: "C12", label: "Funcionamento ocupacional" },
  { id: "C13", label: "Funcionamento social" },
  { id: "C14", label: "Ideação suicida" },
];

/** Pilares fixos P1-P9 */
export const PILARES: { id: PilarId; label: string }[] = [
  { id: "P1", label: "Sono" },
  { id: "P2", label: "Alimentação" },
  { id: "P3", label: "Controle do estresse" },
  { id: "P4", label: "Atividade física" },
  { id: "P5", label: "Relações sociais" },
  { id: "P6", label: "Lazer" },
  { id: "P7", label: "Uso de substâncias" },
  { id: "P8", label: "Saúde física" },
  { id: "P9", label: "Sexualidade" },
];

/** Score clínico máximo */
export const SCORE_CLINICO_MAX = 42;

/** Número de pilares para média */
export const NUM_PILARES = 9;
