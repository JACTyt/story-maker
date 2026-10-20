import { stripSuggestionMarkers } from "./suggestions";

type NamedEntity = { name: string; description: string };
type CharacterEntity = { name: string; appearance: string; personality: string };

type StoryContext = { premise: string; systemPrompt?: string };

function authorInstructionLines(story: StoryContext): string[] {
  return story.systemPrompt?.trim() ? [`Additional instructions from the author:\n${story.systemPrompt.trim()}`] : [];
}

/** Optional keyed fields any marker may carry; the parser ignores unknown or empty ones. */
export const MARKER_EXTRAS_INSTRUCTION =
  "You may append optional fields to any marker, each as key=value: aliases=comma, separated, names (other names or nicknames used in the text), summary=one short line, role=protagonist|antagonist|supporting|minor (characters only), kind=city|building|room|vessel|etc. (places only).";

const MARKER_FORMAT_INSTRUCTION =
  "When you notice a new character, place, theme, or timeline event worth tracking, propose it using this exact format on its own line: [[suggest:character|Name|Appearance|Personality]] for a character (Appearance = physical/external description, Personality = character traits), or [[suggest:TYPE|name|description]] for a place, theme, or timeline event, where TYPE is place, theme, or timeline. Do not propose a character, place, or theme that is already in the story bible above — only propose things that are genuinely new.";

/**
 * @param storyBible the chapter-scoped bible from `buildStoryContext().toPrompt()`:
 *   full detail for what this chapter touches, one line for the rest.
 */
export function buildChatSystemPrompt(story: StoryContext, storyBible: string): string {
  return [
    "You are a collaborative fiction-writing assistant helping a novelist develop a story through conversation.",
    `Story premise: ${story.premise || "(not set yet)"}`,
    "Known story bible:",
    storyBible,
    ...authorInstructionLines(story),
    MARKER_FORMAT_INSTRUCTION,
    MARKER_EXTRAS_INSTRUCTION,
  ].join("\n\n");
}

/** The formatting set the editor supports; anything else is lost or flattened on load. */
export const PROSE_FORMAT_INSTRUCTION = [
  "Write only the prose itself, with no commentary, title, headings, or meta-text. Format it as markdown, using only:",
  "- *italic* for a character's unspoken thoughts, emphasis, foreign words, and titles of works",
  "- **bold** rarely, only for something that must visually shout (a sign, a scream)",
  "- a line containing only * * * between scenes, when time or place jumps",
  "- > blockquotes for letters, notes, inscriptions, signs, or documents quoted in full",
  "Separate paragraphs with a blank line. Do not use headings, lists, tables, or code.",
].join("\n");

export function buildProseSystemPrompt(story: StoryContext, storyBible?: string): string {
  return [
    "You are a skilled fiction writer. Expand the conversation below between a novelist and their writing assistant into fully realized narrative prose for one chapter — don't merely transcribe or lightly paraphrase the dialogue. Add sensory detail, setting description, pacing, and interiority so the result reads like a finished chapter, not a chat log.",
    `Story premise: ${story.premise || "(not set yet)"}`,
    ...(storyBible ? ["Story bible (stay consistent with every established detail):", storyBible] : []),
    ...authorInstructionLines(story),
    PROSE_FORMAT_INSTRUCTION,
  ].join("\n\n");
}

export function buildProseTranscript(history: { role: "user" | "assistant"; content: string }[]): string {
  return history
    .map((m) => `${m.role === "user" ? "Novelist" : "Co-writer"}: ${stripSuggestionMarkers(m.content)}`)
    .filter((line) => !line.endsWith(": "))
    .join("\n\n");
}

export function buildQuickStartPrompt(
  story: StoryContext,
  existing: { characters: CharacterEntity[]; places: NamedEntity[]; themes: NamedEntity[] }
): string {
  const characterLines =
    existing.characters.map((c) => `- ${c.name} — Appearance: ${c.appearance}. Personality: ${c.personality}.`).join("\n") ||
    "(none yet)";
  const placeLines = existing.places.map((p) => `- ${p.name}: ${p.description}`).join("\n") || "(none yet)";
  const themeLines = existing.themes.map((t) => `- ${t.name}: ${t.description}`).join("\n") || "(none yet)";

  return [
    "You are helping a novelist quickly populate their story bible with characters, places, and themes.",
    `Story premise: ${story.premise || "(not set yet)"}`,
    "Already established characters:",
    characterLines,
    "Already established places (locations where the action takes place):",
    placeLines,
    "Already established themes (genre and setting styles, e.g. Cyberpunk, Post-apocalypse, Gothic horror — not literary themes like \"betrayal\" or \"trust\"):",
    themeLines,
    "The writer will describe what they want next. Propose about 3 NEW character variants, 3 NEW place variants, and 3 NEW theme (genre/setting) variants that fit their description and do not duplicate what's already established above.",
    "Output ONLY lines in this exact format, one per proposal, and nothing else: [[suggest:character|Name|Appearance|Personality]] for a character (Appearance = physical/external description, Personality = character traits), or [[suggest:TYPE|name|description]] for a place or theme, where TYPE is place or theme.",
    MARKER_EXTRAS_INSTRUCTION,
  ].join("\n\n");
}

export function buildSuggestEntityPrompt(
  story: StoryContext,
  type: "character" | "place" | "theme",
  name: string,
  existing: { characters: CharacterEntity[]; places: NamedEntity[]; themes: NamedEntity[] }
): string {
  const characterLines =
    existing.characters.map((c) => `- ${c.name} — Appearance: ${c.appearance}. Personality: ${c.personality}.`).join("\n") ||
    "(none yet)";
  const placeLines = existing.places.map((p) => `- ${p.name}: ${p.description}`).join("\n") || "(none yet)";
  const themeLines = existing.themes.map((t) => `- ${t.name}: ${t.description}`).join("\n") || "(none yet)";

  const outputInstruction =
    type === "character"
      ? `Output ONLY one line in this exact format and nothing else: [[suggest:character|${name}|Appearance|Personality]] where Appearance is a physical/external description and Personality is character traits.`
      : `Output ONLY one line in this exact format and nothing else: [[suggest:${type}|${name}|description]].`;

  return [
    `You are helping a novelist flesh out a single new ${type} for their story bible.`,
    `Story premise: ${story.premise || "(not set yet)"}`,
    "Already established characters:",
    characterLines,
    "Already established places (locations where the action takes place):",
    placeLines,
    "Already established themes (genre and setting styles, e.g. Cyberpunk, Post-apocalypse, Gothic horror):",
    themeLines,
    `The writer has named a new ${type}: "${name}". Write a fitting ${
      type === "character" ? "appearance and personality" : "description"
    } for it, consistent with the story premise and everything already established above.`,
    outputInstruction,
    type === "theme" ? "" : `${MARKER_EXTRAS_INSTRUCTION} Always include summary= and, when natural, aliases=.`,
  ].filter(Boolean).join("\n\n");
}
