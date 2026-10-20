import type { MentionEntity } from "./mentions";

type Named = { id: number; aliases: string[] };

/** Every name each bible entry may appear under in prose. Shared by server and client. */
export function bibleMentionEntities(bible: {
  characters: (Named & { name: string })[];
  places: (Named & { name: string })[];
  timeline: (Named & { title: string })[];
  themes: { id: number; name: string }[];
}): MentionEntity[] {
  return [
    ...bible.characters.map((c) => ({ type: "character" as const, id: c.id, names: [c.name, ...c.aliases] })),
    ...bible.places.map((p) => ({ type: "place" as const, id: p.id, names: [p.name, ...p.aliases] })),
    ...bible.timeline.map((t) => ({ type: "timeline" as const, id: t.id, names: [t.title, ...t.aliases] })),
    ...bible.themes.map((t) => ({ type: "theme" as const, id: t.id, names: [t.name] })),
  ];
}
