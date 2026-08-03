import { describe, it, expect } from "vitest";
import { buildChatSystemPrompt, buildQuickStartPrompt } from "./prompts";

describe("buildChatSystemPrompt", () => {
  it("includes premise, characters, themes, and the suggestion format", () => {
    const prompt = buildChatSystemPrompt(
      { premise: "A moon made of spice" },
      {
        characters: [{ name: "Mira", description: "A smuggler" }],
        themes: [{ name: "Betrayal", description: "Trust broken" }],
        timelineEvents: [{ title: "The war begins", description: "Empire attacks", inStoryDateLabel: "Year 20" }],
      }
    );
    expect(prompt).toContain("A moon made of spice");
    expect(prompt).toContain("Mira: A smuggler");
    expect(prompt).toContain("Betrayal: Trust broken");
    expect(prompt).toContain("Year 20: The war begins: Empire attacks");
    expect(prompt).toContain("[[suggest:TYPE|name|description]]");
  });

  it("handles empty entity lists gracefully", () => {
    const prompt = buildChatSystemPrompt({ premise: "" }, { characters: [], themes: [], timelineEvents: [] });
    expect(prompt).toContain("(none yet)");
  });
});

describe("buildQuickStartPrompt", () => {
  it("includes premise, existing entities, and the marker output instruction", () => {
    const prompt = buildQuickStartPrompt(
      { premise: "A moon made of spice" },
      {
        characters: [{ name: "Mira", description: "A smuggler" }],
        scenes: [{ title: "Docking bay ambush", description: "Mira is cornered" }],
        themes: [],
      }
    );
    expect(prompt).toContain("A moon made of spice");
    expect(prompt).toContain("Mira: A smuggler");
    expect(prompt).toContain("Docking bay ambush: Mira is cornered");
    expect(prompt).toContain("(none yet)");
    expect(prompt).toContain("[[suggest:TYPE|name|description]]");
  });
});
