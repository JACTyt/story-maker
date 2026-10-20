/**
 * A plain-text stream cannot carry a status code once it has started, so a
 * failure part-way through is signalled in-band. NUL never appears in prose.
 */
export const STREAM_ERROR_PREFIX = "\u0000error:";

export function splitStreamError(text: string): { text: string; error: string | null } {
  const at = text.indexOf(STREAM_ERROR_PREFIX);
  if (at === -1) return { text, error: null };
  return { text: text.slice(0, at), error: text.slice(at + STREAM_ERROR_PREFIX.length).trim() || "Generation failed" };
}
