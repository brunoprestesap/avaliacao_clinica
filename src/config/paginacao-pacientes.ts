/** Limites permitidos para itens por página na listagem de pacientes. */
export const PAGINACAO_PACIENTES_LIMITES = [10, 20, 25, 50, 100] as const;

export type LimitePaginacaoPacientes = (typeof PAGINACAO_PACIENTES_LIMITES)[number];

/** Limite padrão por página. */
export const PAGINACAO_PACIENTES_DEFAULT_LIMIT = 20;

export function isLimiteValido(limit: number): limit is LimitePaginacaoPacientes {
  return PAGINACAO_PACIENTES_LIMITES.includes(limit as LimitePaginacaoPacientes);
}

export function normalizarLimite(limit: number): LimitePaginacaoPacientes {
  if (isLimiteValido(limit)) return limit;
  return PAGINACAO_PACIENTES_DEFAULT_LIMIT;
}

/** Parseia e valida o parâmetro `page` da query string (1-based). */
export function parsePageFromQuery(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Parseia e valida o parâmetro `limit` da query string. */
export function parseLimitFromQuery(value: string | undefined): LimitePaginacaoPacientes {
  const n = Number(value);
  return normalizarLimite(Number.isFinite(n) ? n : PAGINACAO_PACIENTES_DEFAULT_LIMIT);
}

const SEARCH_QUERY_MAX_LENGTH = 100;

/** Parseia e normaliza o parâmetro de busca `q` da query string (trim, limite de tamanho). */
export function parseSearchFromQuery(value: string | undefined): string {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return "";
  return trimmed.slice(0, SEARCH_QUERY_MAX_LENGTH);
}
