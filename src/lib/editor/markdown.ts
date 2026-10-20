const SCENE_BREAK_LINE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const BULLET_MARKER = /^(\s*)([-+*])(\s)/;
const NUMBER_MARKER = /^(\s*\d+)([.)])(\s)/;

/**
 * Prose has no lists, but dialogue is often written with a leading dash and
 * models number things. Escaping the marker keeps those lines as ordinary
 * paragraphs instead of merging them into a list the schema cannot hold.
 * Applied on every load, because the serialiser writes the marker back bare.
 */
export function prepareProseMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => (SCENE_BREAK_LINE.test(line) ? line : line.replace(BULLET_MARKER, "$1\\$2$3").replace(NUMBER_MARKER, "$1\\$2$3")))
    .join("\n");
}

/** The serialiser HTML-escapes text; prose is stored as the writer typed it. */
export function finalizeProseMarkdown(markdown: string): string {
  return markdown
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
