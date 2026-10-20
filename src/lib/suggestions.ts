export type SuggestionType = "character" | "place" | "theme" | "timeline";

/** Optional details a model may add as `key=value` fields after the positional ones. */
export type SuggestionExtras = { aliases?: string[]; role?: CharacterRole; summary?: string; kind?: string };

export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor";
const CHARACTER_ROLES: readonly string[] = ["protagonist", "antagonist", "supporting", "minor"];

export type SuggestionMarker =
  | ({ type: "character"; name: string; appearance: string; personality: string } & SuggestionExtras)
  | ({ type: "place" | "theme" | "timeline"; name: string; description: string } & SuggestionExtras);

const EXTRA_FIELD = /^(aliases|role|summary|kind)\s*=\s*([\s\S]*)$/i;

/** Splits keyed extras out of the field list, so positional parsing is unchanged for old markers. */
function takeExtras(fields: string[]): { positional: string[]; extras: SuggestionExtras } {
  const extras: SuggestionExtras = {};
  const positional: string[] = [];
  for (const field of fields) {
    const match = EXTRA_FIELD.exec(field);
    if (!match) {
      positional.push(field);
      continue;
    }
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (!value) continue;
    if (key === "aliases") extras.aliases = value.split(",").map((a) => a.trim()).filter(Boolean);
    else if (key === "role") {
      if (CHARACTER_ROLES.includes(value.toLowerCase())) extras.role = value.toLowerCase() as CharacterRole;
    } else if (key === "summary") extras.summary = value;
    else if (key === "kind") extras.kind = value;
  }
  return { positional, extras };
}

const MARKER_REGEX = /\[\[suggest:([^\]]*)\]\]/g;

const SUGGESTION_TYPES: readonly SuggestionType[] = ["character", "place", "theme", "timeline"];

function isSuggestionType(value: string): value is SuggestionType {
  return (SUGGESTION_TYPES as readonly string[]).includes(value);
}

/**
 * Turns one marker's inner text into a typed marker.
 *
 * Field counts vary in practice: models emit the two-field character form as
 * readily as the three-field one, and sometimes add a field beyond the schema.
 * Rather than reject those, the extra fields are folded into the last slot and
 * a missing third field is left empty. Anything without a name and at least one
 * detail carries no usable information and is dropped.
 */
function parseMarkerBody(body: string): SuggestionMarker | null {
  const [rawType, ...allFields] = body.split("|").map((part) => part.trim());
  const type = rawType.toLowerCase();
  if (!isSuggestionType(type)) return null;
  const { positional: fields, extras } = takeExtras(allFields);

  const [name, ...details] = fields;
  if (!name || details.length === 0) return null;

  if (type === "character") {
    const [appearance, ...rest] = details;
    if (!appearance) return null;
    return { type, name, appearance, personality: rest.join(" ").trim(), ...extras };
  }

  const description = details.join(" ").trim();
  if (!description) return null;
  return { type, name, description, ...extras };
}

/**
 * @param onDropped receives the raw body of any marker that carried no usable
 *   entity, so a model drifting from the format is visible rather than silent.
 */
export function parseSuggestionMarkers(text: string, onDropped?: (body: string) => void): SuggestionMarker[] {
  const markers: SuggestionMarker[] = [];
  for (const match of text.matchAll(MARKER_REGEX)) {
    const marker = parseMarkerBody(match[1]);
    if (marker) markers.push(marker);
    else onDropped?.(match[1]);
  }
  return markers;
}

/**
 * Removes every marker from text meant for a human or for the prose model,
 * including malformed ones the parser rejects, then tidies the gaps they leave.
 */
export function stripSuggestionMarkers(text: string): string {
  return text
    .replace(MARKER_REGEX, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The parts of a marker that identify which entity it refers to. */
export type SuggestionIdentity = { type: SuggestionType; name: string };

/** Identity used to recognise the same entity across suggestions and bible entries. */
export function suggestionKey(marker: SuggestionMarker | SuggestionIdentity): string {
  return `${marker.type}:${marker.name.trim().toLowerCase()}`;
}
