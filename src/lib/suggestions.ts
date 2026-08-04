export type SuggestionType = "character" | "place" | "theme" | "timeline";

export type SuggestionMarker =
  | { type: "character"; name: string; appearance: string; personality: string }
  | { type: "place" | "theme" | "timeline"; name: string; description: string };

export function parseSuggestionMarkers(text: string): SuggestionMarker[] {
  const found: { index: number; marker: SuggestionMarker }[] = [];

  const characterRegex = /\[\[suggest:character\|([^|]+)\|([^|]+)\|([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = characterRegex.exec(text))) {
    found.push({
      index: match.index,
      marker: { type: "character", name: match[1].trim(), appearance: match[2].trim(), personality: match[3].trim() },
    });
  }

  const otherRegex = /\[\[suggest:(place|theme|timeline)\|([^|]+)\|([^\]]+)\]\]/g;
  while ((match = otherRegex.exec(text))) {
    found.push({
      index: match.index,
      marker: { type: match[1] as "place" | "theme" | "timeline", name: match[2].trim(), description: match[3].trim() },
    });
  }

  return found.sort((a, b) => a.index - b.index).map((f) => f.marker);
}
