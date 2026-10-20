import { buildMatcher, entityKey, findMentions, stripEntityLinks, parseEntityHref, type MentionEntity } from "./mentions";

type Character = {
  id: number;
  name: string;
  aliases: string[];
  role: string;
  summary: string;
  appearance: string;
  personality: string;
  backstory: string;
  goals: string;
  notes: string;
};
type Place = { id: number; name: string; aliases: string[]; kind: string; parentPlaceId: number | null; summary: string; description: string };
type Theme = { id: number; name: string; description: string };
type TimelineEvent = {
  id: number;
  title: string;
  aliases: string[];
  description: string;
  inStoryDateLabel: string;
  placeId: number | null;
  chapterIds: number[];
  characterIds: number[];
};
type Relationship = { fromCharacterId: number; toCharacterId: number; label: string };

export type ContextBible = {
  characters: Character[];
  places: Place[];
  themes: Theme[];
  timeline: TimelineEvent[];
  relationships: Relationship[];
};

const sentence = (s: string) => {
  const t = s.trim();
  return t && !/[.!?…]$/.test(t) ? `${t}.` : t;
};
const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(" ");
const aka = (aliases: string[]) => (aliases.length ? ` (also: ${aliases.join(", ")})` : "");

/** Entity keys the chapter refers to — auto-matched names plus manual links. */
function mentionedKeys(bible: ContextBible, texts: string[]): Set<string> {
  const entities: MentionEntity[] = [
    ...bible.characters.map((c) => ({ type: "character" as const, id: c.id, names: [c.name, ...c.aliases] })),
    ...bible.places.map((p) => ({ type: "place" as const, id: p.id, names: [p.name, ...p.aliases] })),
    ...bible.timeline.map((t) => ({ type: "timeline" as const, id: t.id, names: [t.title, ...t.aliases] })),
  ];
  const matcher = buildMatcher(entities);
  const keys = new Set<string>();
  for (const text of texts) {
    for (const [, href] of text.matchAll(/\]\((entity:[^)\s]+)\)/g)) {
      const target = parseEntityHref(href);
      if (target && target !== "none") keys.add(entityKey(target.type, target.id));
    }
    for (const mention of findMentions(stripEntityLinks(text), matcher)) mention.keys.forEach((k) => keys.add(k));
  }
  return keys;
}

/**
 * The story bible as the model should see it for one chapter: full detail for
 * what this chapter is about, one line for everything else. Keeps prompts
 * bounded as the bible grows, and puts consistency weight where it matters.
 */
export function buildStoryContext(bible: ContextBible, scope: { chapterId: number; texts: string[] }) {
  const keys = mentionedKeys(bible, scope.texts);
  for (const event of bible.timeline) {
    if (event.chapterIds.includes(scope.chapterId)) keys.add(entityKey("timeline", event.id));
  }

  const nameOf = (id: number) => bible.characters.find((c) => c.id === id)?.name ?? "";
  const placeName = (id: number | null) => (id === null ? "" : bible.places.find((p) => p.id === id)?.name ?? "");

  const characterFull = (c: Character) => {
    const relations = bible.relationships
      .filter((r) => r.fromCharacterId === c.id || r.toCharacterId === c.id)
      .map((r) =>
        r.fromCharacterId === c.id ? `${r.label || "related to"} → ${nameOf(r.toCharacterId)}` : `${nameOf(r.fromCharacterId)} → ${r.label || "related to"} them`
      );
    return [
      `- ${c.name}${aka(c.aliases)} — ${join(c.role ? `${c.role}.` : "", sentence(c.summary))}`,
      c.appearance && `  Appearance: ${c.appearance}`,
      c.personality && `  Personality: ${c.personality}`,
      c.goals && `  Goals: ${c.goals}`,
      c.backstory && `  Backstory: ${c.backstory}`,
      relations.length > 0 && `  Relationships: ${relations.join("; ")}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const placeFull = (p: Place) => {
    const parent = placeName(p.parentPlaceId);
    return `- ${p.name}${aka(p.aliases)} — ${join(p.kind ? `${p.kind}${parent ? ` in ${parent}` : ""}.` : "", sentence(p.summary), sentence(p.description))}`;
  };

  const eventFull = (e: TimelineEvent) => {
    const where = placeName(e.placeId);
    const who = e.characterIds.map(nameOf).filter(Boolean);
    const detail = [where && `at ${where}`, who.length > 0 && `involves ${who.join(", ")}`].filter(Boolean).join("; ");
    return `- ${e.inStoryDateLabel ? `${e.inStoryDateLabel}: ` : ""}${e.title} — ${sentence(e.description)}${detail ? ` (${detail})` : ""}`;
  };

  const oneLine = (name: string, summary: string, fallback: string) => {
    const text = (summary || fallback).trim();
    return `- ${name}${text ? ` — ${text.length > 140 ? `${text.slice(0, 140)}…` : text}` : ""}`;
  };

  const inChapter: string[] = [];
  const elsewhere: string[] = [];
  for (const c of bible.characters) {
    if (keys.has(entityKey("character", c.id))) inChapter.push(characterFull(c));
    else elsewhere.push(oneLine(c.name, c.summary, c.personality || c.appearance));
  }
  for (const p of bible.places) {
    if (keys.has(entityKey("place", p.id))) inChapter.push(placeFull(p));
    else elsewhere.push(oneLine(p.name, p.summary, p.description));
  }
  for (const e of bible.timeline) {
    if (keys.has(entityKey("timeline", e.id))) inChapter.push(eventFull(e));
    else elsewhere.push(oneLine(e.title, "", e.description));
  }
  const themes = bible.themes.map((t) => `- ${t.name}: ${t.description}`);

  const section = (lines: string[]) => (lines.length ? lines.join("\n") : "(none yet)");

  return {
    inChapter: inChapter.join("\n"),
    elsewhere: elsewhere.join("\n"),
    themes: themes.join("\n"),
    toPrompt: () =>
      [
        "In this chapter (keep these exactly consistent):",
        section(inChapter),
        "Elsewhere in the story:",
        section(elsewhere),
        "Themes (genre and setting styles, e.g. Cyberpunk, Gothic horror — not literary themes like \"betrayal\"):",
        section(themes),
      ].join("\n\n"),
  };
}
