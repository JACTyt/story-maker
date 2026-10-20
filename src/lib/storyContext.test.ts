import { describe, it, expect } from "vitest";
import { buildStoryContext, type ContextBible } from "./storyContext";

function bible(): ContextBible {
  const character = (id: number, name: string, extra: object = {}) => ({
    id,
    name,
    aliases: [] as string[],
    role: "" as const,
    summary: "",
    appearance: "",
    personality: "",
    backstory: "",
    goals: "",
    notes: "",
    ...extra,
  });
  return {
    characters: [
      character(1, "Elizabeth", { aliases: ["Liz"], role: "protagonist", summary: "Runs from debts.", appearance: "Ink-stained", goals: "Reach Saltmarsh" }),
      character(2, "Tom", { summary: "Ferryman's son." }),
      character(3, "Mara", { summary: "Keeps the ledger.", personality: "Patient" }),
    ],
    places: [
      { id: 10, name: "Old Harbour", aliases: [], kind: "district", parentPlaceId: null, summary: "Tar and gulls.", description: "Long stone quays." },
      { id: 11, name: "Saltmarsh", aliases: [], kind: "village", parentPlaceId: null, summary: "Across the estuary.", description: "" },
    ],
    themes: [{ id: 30, name: "Gothic", description: "Decay and dread." }],
    timeline: [
      { id: 20, title: "The storm", aliases: [], description: "Sinks a ship.", inStoryDateLabel: "Autumn", placeId: 10, chapterIds: [5], characterIds: [2] },
      { id: 21, title: "Coronation", aliases: [], description: "Years ago.", inStoryDateLabel: "", placeId: null, chapterIds: [], characterIds: [] },
    ],
    relationships: [{ fromCharacterId: 1, toCharacterId: 2, label: "owes a favour" }],
  };
}

describe("buildStoryContext", () => {
  const context = buildStoryContext(bible(), { chapterId: 5, texts: ["Liz reached the Old Harbour."] });

  it("gives full detail for entities mentioned in this chapter", () => {
    expect(context.inChapter).toContain("Elizabeth (also: Liz) — protagonist. Runs from debts.");
    expect(context.inChapter).toContain("Appearance: Ink-stained");
    expect(context.inChapter).toContain("Goals: Reach Saltmarsh");
    expect(context.inChapter).toContain("owes a favour → Tom");
    expect(context.inChapter).toContain("Old Harbour — district. Tar and gulls. Long stone quays.");
  });

  it("includes timeline events linked to this chapter, with where and who", () => {
    expect(context.inChapter).toContain("Autumn: The storm — Sinks a ship. (at Old Harbour; involves Tom)");
  });

  it("gives everything else one line", () => {
    expect(context.elsewhere).toContain("- Mara — Keeps the ledger.");
    expect(context.elsewhere).not.toContain("Patient");
    expect(context.elsewhere).toContain("- Saltmarsh — Across the estuary.");
    expect(context.elsewhere).toContain("- Coronation — Years ago.");
  });

  it("always lists themes in full", () => {
    expect(context.themes).toContain("- Gothic: Decay and dread.");
  });

  it("renders as prompt text with clear headings", () => {
    const text = context.toPrompt();
    expect(text).toContain("In this chapter (keep these exactly consistent):");
    expect(text).toContain("Elsewhere in the story:");
  });

  it("says so when nothing is known", () => {
    const empty = buildStoryContext(
      { characters: [], places: [], themes: [], timeline: [], relationships: [] },
      { chapterId: 1, texts: [] }
    );
    expect(empty.toPrompt()).toContain("(none yet)");
  });
});
