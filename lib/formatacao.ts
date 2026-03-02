/**
 * Utilitários de formatação para exibição e nomes de arquivo.
 * Datas esperadas em ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss).
 */

/** Extrai a parte da data (YYYY-MM-DD) de uma string ISO. */
function parseISODate(isoDate: string): string | null {
  const part = isoDate.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : null;
}

/**
 * Formata data para exibição (dd/mm/yyyy).
 * Retorna string vazia se o formato for inválido.
 */
export function formatarDataExibicao(isoDate: string): string {
  const part = parseISODate(isoDate);
  if (!part) return "";
  const [y, m, d] = part.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Retorna a data no formato YYYY-MM-DD para uso em nomes de arquivo.
 */
export function formatarDataParaNomeArquivo(isoDate: string): string {
  const part = parseISODate(isoDate);
  return part ?? isoDate.replace(/T.*/, "").slice(0, 10);
}

/**
 * Sanitiza string para uso seguro em nomes de arquivo (apenas ASCII alfanumérico, ponto e hífen).
 */
export function nomeArquivoSeguro(identificador: string): string {
  return identificador.replace(/[^a-zA-Z0-9.-]/g, "_");
}
