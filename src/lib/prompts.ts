import { stripSuggestionMarkers } from "./suggestions";

type NamedEntity = { name: string; description: string };
type CharacterEntity = { name: string; appearance: string; personality: string };
type TimelineEntity = { title: string; description: string; inStoryDateLabel: string };

type StoryContext = { premise: string; systemPrompt?: string };

function authorInstructionLines(story: StoryContext): string[] {
  return story.systemPrompt?.trim() ? [`Additional instructions from the author:\n${story.systemPrompt.trim()}`] : [];
}

const MARKER_FORMAT_INSTRUCTION =
  "When you notice a new character, place, theme, or timeline event worth tracking, propose it using this exact format on its own line: [[suggest:character|Name|Appearance|Personality]] for a character (Appearance = physical/external description, Personality = character traits), or [[suggest:TYPE|name|description]] for a place, theme, or timeline event, where TYPE is place, theme, or timeline. Do not propose a character, place, or theme that is already listed above as known — only propose things that are genuinely new.";

export function buildChatSystemPrompt(
  story: StoryContext,
  entities: { characters: CharacterEntity[]; places: NamedEntity[]; themes: NamedEntity[]; timelineEvents: TimelineEntity[] }
): string {
  const characterLines =
    entities.characters.map((c) => `- ${c.name} — Appearance: ${c.appearance}. Personality: ${c.personality}.`).join("\n") ||
    "(none yet)";
  const placeLines = entities.places.map((p) => `- ${p.name}: ${p.description}`).join("\n") || "(none yet)";
  const themeLines = entities.themes.map((t) => `- ${t.name}: ${t.description}`).join("\n") || "(none yet)";
  const timelineLines =
    entities.timelineEvents
      .map((e) => `- ${e.inStoryDateLabel ? e.inStoryDateLabel + ": " : ""}${e.title}: ${e.description}`)
      .join("\n") || "(none yet)";

  return [
    "You are a collaborative fiction-writing assistant helping a novelist develop a story through conversation.",
    `Story premise: ${story.premise || "(not set yet)"}`,
    "Known characters:",
    characterLines,
    "Known places (locations where the action takes place):",
    placeLines,
    "Known themes (genre and setting styles, e.g. Cyberpunk, Post-apocalypse, Gothic horror — not literary themes like \"betrayal\" or \"trust\"):",
    themeLines,
    "Known timeline events:",
    timelineLines,
    ...authorInstructionLines(story),
    MARKER_FORMAT_INSTRUCTION,
  ].join("\n\n");
}

export function buildProseSystemPrompt(
  story: StoryContext,
  entities?: { characters: CharacterEntity[]; places: NamedEntity[] }
): string {
  const characterLines =
    entities?.characters.map((c) => `- ${c.name} — Appearance: ${c.appearance}. Personality: ${c.personality}.`).join("\n") ||
    "";
  const placeLines = entities?.places.map((p) => `- ${p.name}: ${p.description}`).join("\n") || "";

  return [
    "You are a skilled fiction writer. Expand the conversation below between a novelist and their writing assistant into fully realized narrative prose for one chapter — don't merely transcribe or lightly paraphrase the dialogue. Add sensory detail, setting description, pacing, and interiority so the result reads like a finished chapter, not a chat log.",
    `Story premise: ${story.premise || "(not set yet)"}`,
    ...(characterLines ? ["Known characters (stay consistent with their established appearance and personality):", characterLines] : []),
    ...(placeLines ? ["Known places (stay consistent with their established description):", placeLines] : []),
    ...authorInstructionLines(story),
    "Write only the prose itself, with no commentary, headings, or meta-text.",
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
  ].join("\n\n");
}
