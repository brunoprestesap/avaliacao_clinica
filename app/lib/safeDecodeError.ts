/**
 * Decodifica o parâmetro error da URL de forma segura.
 * Evita exceção por URI malformado e limita tamanho para exibição.
 */
const MAX_ERROR_DISPLAY_LENGTH = 500;

export function safeDecodeError(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  try {
    const decoded = decodeURIComponent(value);
    return decoded.length > MAX_ERROR_DISPLAY_LENGTH
      ? decoded.slice(0, MAX_ERROR_DISPLAY_LENGTH) + "…"
      : decoded;
  } catch {
    return "";
  }
}
