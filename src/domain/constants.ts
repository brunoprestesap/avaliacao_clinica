import type {
  ItemClinicoId,
  PilarId,
  ClassificacaoClinica,
  ClassificacaoEstrutural,
  VariacaoComparacao,
} from "./types";

/** Instrução do formulário clínico (escala_clinica_1.pdf) */
export const INSTRUCAO_CLINICA =
  "Para responder as perguntas, considere as últimas 2 semanas.";

/** Instrução do formulário de pilares (escala_clinica_2.pdf) */
export const INSTRUCAO_PILARES =
  "Para responder as perguntas, considere as últimas 4 semanas.";

/** Escala clínica 0-3: labels alinhados ao PDF */
export const ESCALA_CLINICA_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: "Não aconteceu",
  1: "Aconteceu poucos dias",
  2: "Aconteceu mais da metade dos dias",
  3: "Aconteceu quase todos os dias ou com intensidade importante",
};

/** Escala estrutural 0-4: labels alinhados ao PDF */
export const ESCALA_ESTRUTURAL_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Muito ruim / totalmente desorganizado",
  1: "Ruim",
  2: "Regular",
  3: "Bom",
  4: "Muito bom / bem estruturado",
};

/** Itens clínicos na ordem do PDF (escala_clinica_1); 9º = ideação (C14) */
export const ITENS_CLINICOS: { id: ItemClinicoId; label: string }[] = [
  { id: "C1", label: "Sentiu-se triste, desanimado(a) ou sem esperança?" },
  { id: "C3", label: "Perdeu interesse ou prazer nas atividades que costuma gostar?" },
  { id: "C7", label: "Teve dificuldade para dormir ou dormiu mais que o habitual?" },
  { id: "C5", label: "Sentiu cansaço ou falta de energia na maior parte dos dias?" },
  { id: "C8", label: "Percebeu alteração significativa no apetite ou peso?" },
  { id: "C9", label: "Sentiu-se culpado(a), inadequado(a) ou com sensação de fracasso?" },
  { id: "C6", label: "Teve dificuldade de concentração em leitura, trabalho ou conversas?" },
  { id: "C11", label: "Sentiu-se mais lento(a) que o habitual ou, ao contrário, inquieto(a) e incapaz de ficar parado(a)?" },
  { id: "C14", label: "Teve pensamentos de que seria melhor não estar vivo(a) ou de se machucar?" },
  { id: "C2", label: "Sentiu-se excessivamente preocupado(a) com várias coisas ao mesmo tempo?" },
  { id: "C10", label: "Teve dificuldade para controlar ou interromper essas preocupações?" },
  { id: "C4", label: "Sentiu tensão, inquietação, irritabilidade ou medo constante de que algo ruim pudesse acontecer?" },
  { id: "C12", label: "Seu estado emocional prejudicou seu desempenho no trabalho, estudos ou responsabilidades domésticas?" },
  { id: "C13", label: "Seu estado emocional prejudicou sua vida social, relacionamentos ou atividades de lazer?" },
];

/** Pilares com pergunta completa (escala_clinica_2.pdf) */
export const PILARES: { id: PilarId; label: string; pergunta: string }[] = [
  { id: "P1", label: "Sono", pergunta: "Como você avalia seu sono: dorme durante 7-8h, acorda descansado, mantém horário relativamente regular?" },
  { id: "P2", label: "Alimentação", pergunta: "Como você avalia sua alimentação: regularidade das refeições, qualidade nutricional, excesso de ultraprocessados ou compulsões?" },
  { id: "P3", label: "Controle do estresse", pergunta: "Como você avalia sua capacidade de lidar com o estresse (consegue desacelerar, vive em estado constante de tensão, tem estratégias saudáveis de regulação)?" },
  { id: "P4", label: "Atividade física", pergunta: "Como você avalia sua prática de atividade física (frequência, regularidade, movimento consistente)?" },
  { id: "P5", label: "Relações sociais", pergunta: "Como você avalia a qualidade das suas relações sociais (tem pessoas de confiança, mantém contato regular, sente-se compreendido(a))?" },
  { id: "P6", label: "Lazer", pergunta: "Como você avalia sua vida de lazer e momentos de prazer (dedica tempo para atividades prazerosas, consegue relaxar sem culpa)?" },
  { id: "P7", label: "Uso de substâncias", pergunta: "Como você avalia seu controle sobre álcool, cigarro, cafeína ou outras substâncias (frequência, dependência, impacto no seu bem-estar)?" },
  { id: "P8", label: "Saúde física", pergunta: "Como você avalia o cuidado com sua saúde física (doenças controladas, exames em dia, acompanhamento médico, hábitos gerais)?" },
  { id: "P9", label: "Sexualidade", pergunta: "Como você avalia sua vida sexual e intimidade emocional (desejo, satisfação, conforto nessa área)?" },
];

/** Score clínico máximo */
export const SCORE_CLINICO_MAX = 42;

/** Número de pilares para média */
export const NUM_PILARES = 9;

/** Escala máxima dos pilares (radar/barras) */
export const PILARES_FULL_MARK = 4;

/** Labels para exibição da classificação clínica */
export const CLASSIFICACAO_CLINICA_LABELS: Record<ClassificacaoClinica, string> = {
  CLINICO_ESTAVEL: "Estável",
  CLINICO_LEVE: "Leve",
  CLINICO_MODERADO: "Moderado - alto",
  CLINICO_GRAVE: "Grave",
};

/** Labels para exibição da classificação estrutural */
export const CLASSIFICACAO_ESTRUTURA_LABELS: Record<ClassificacaoEstrutural, string> = {
  ESTRUTURA_COMPROMETIDA: "Estrutura comprometida",
  ESTRUTURA_INSTAVEL: "Estrutura instável",
  ESTRUTURA_FUNCIONAL: "Estrutura funcional",
  ESTRUTURA_BEM_ESTRUTURADA: "Alta organização",
};

/** Labels para exibição da variação na comparação */
export const VARIACAO_LABELS: Record<VariacaoComparacao, string> = {
  MELHORA_RELEVANTE: "Melhora relevante",
  ESTAVEL: "Estável",
  PIORA_RELEVANTE: "Piora relevante",
};
