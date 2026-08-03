export type SuggestionType = "character" | "scene" | "theme" | "timeline";
export type SuggestionMarker = { type: SuggestionType; name: string; description: string };

export function parseSuggestionMarkers(text: string): SuggestionMarker[] {
  const regex = /\[\[suggest:(character|scene|theme|timeline)\|([^|]+)\|([^\]]+)\]\]/g;
  const markers: SuggestionMarker[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    markers.push({ type: match[1] as SuggestionType, name: match[2].trim(), description: match[3].trim() });
  }
  return markers;
}
