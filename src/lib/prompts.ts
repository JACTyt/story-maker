type NamedEntity = { name: string; description: string };
type TimelineEntity = { title: string; description: string; inStoryDateLabel: string };

export function buildChatSystemPrompt(
  story: { premise: string },
  entities: { characters: NamedEntity[]; themes: NamedEntity[]; timelineEvents: TimelineEntity[] }
): string {
  const characterLines = entities.characters.map((c) => `- ${c.name}: ${c.description}`).join("\n") || "(none yet)";
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
    "Known themes:",
    themeLines,
    "Known timeline events:",
    timelineLines,
    "When you notice a new character, scene, theme, or timeline event worth tracking, propose it using this exact format on its own line: [[suggest:TYPE|name|description]] where TYPE is one of character, scene, theme, timeline.",
  ].join("\n\n");
}

export function buildProseSystemPrompt(story: { premise: string }): string {
  return [
    "You are a skilled fiction writer. Turn the following conversation between a novelist and their writing assistant into polished narrative prose for one chapter.",
    `Story premise: ${story.premise || "(not set yet)"}`,
    "Write only the prose itself, with no commentary, headings, or meta-text.",
  ].join("\n\n");
}

type SceneEntity = { title: string; description: string };

export function buildQuickStartPrompt(
  story: { premise: string },
  existing: { characters: NamedEntity[]; scenes: SceneEntity[]; themes: NamedEntity[] }
): string {
  const characterLines = existing.characters.map((c) => `- ${c.name}: ${c.description}`).join("\n") || "(none yet)";
  const sceneLines = existing.scenes.map((s) => `- ${s.title}: ${s.description}`).join("\n") || "(none yet)";
  const themeLines = existing.themes.map((t) => `- ${t.name}: ${t.description}`).join("\n") || "(none yet)";

  return [
    "You are helping a novelist quickly populate their story bible with characters, scenes, and themes.",
    `Story premise: ${story.premise || "(not set yet)"}`,
    "Already established characters:",
    characterLines,
    "Already established scenes:",
    sceneLines,
    "Already established themes:",
    themeLines,
    "The writer will describe what they want next. Propose about 3 NEW character variants, 3 NEW scene variants, and 3 NEW theme variants that fit their description and do not duplicate what's already established above. Output ONLY lines in this exact format, one per proposal, and nothing else: [[suggest:TYPE|name|description]] where TYPE is character, scene, or theme.",
  ].join("\n\n");
}
