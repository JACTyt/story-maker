export type RichSegment = { text: string; bold?: boolean; italic?: boolean; placeDescription?: string };
export type PlaceRef = { name: string; description: string };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitByPlaces(text: string, bold: boolean, italic: boolean, places: PlaceRef[]): RichSegment[] {
  if (!text) return [];
  const named = places.filter((p) => p.name.trim());
  if (named.length === 0) return [{ text, bold, italic }];

  const sorted = [...named].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(`\\b(${sorted.map((p) => escapeRegExp(p.name)).join("|")})\\b`, "gi");

  const segments: RichSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), bold, italic });
    const place = sorted.find((p) => p.name.toLowerCase() === match![0].toLowerCase());
    segments.push({ text: match[0], bold, italic, placeDescription: place?.description });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), bold, italic });
  return segments;
}

export function parseRichText(text: string, places: PlaceRef[]): RichSegment[] {
  const markdownPattern = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  const raw: { text: string; bold?: boolean; italic?: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = markdownPattern.exec(text))) {
    if (match.index > lastIndex) raw.push({ text: text.slice(lastIndex, match.index) });
    if (match[1] !== undefined) raw.push({ text: match[1], bold: true });
    else raw.push({ text: match[2], italic: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) raw.push({ text: text.slice(lastIndex) });

  return raw.flatMap((seg) => splitByPlaces(seg.text, !!seg.bold, !!seg.italic, places));
}
