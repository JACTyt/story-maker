import { describe, it, expect } from "vitest";
import { buildChatSystemPrompt, buildProseSystemPrompt, buildQuickStartPrompt, buildSuggestEntityPrompt } from "./prompts";

describe("buildChatSystemPrompt", () => {
  it("includes premise, characters, places, themes, and the suggestion format", () => {
    const prompt = buildChatSystemPrompt(
      { premise: "A moon made of spice" },
      {
        characters: [{ name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded but loyal" }],
        places: [{ name: "Docking bay", description: "Where Mira is cornered" }],
        themes: [{ name: "Cyberpunk", description: "Neon-lit megacorp dystopia" }],
        timelineEvents: [{ title: "The war begins", description: "Empire attacks", inStoryDateLabel: "Year 20" }],
      }
    );
    expect(prompt).toContain("A moon made of spice");
    expect(prompt).toContain("Mira — Appearance: Scar over one eyebrow. Personality: Guarded but loyal.");
    expect(prompt).toContain("Docking bay: Where Mira is cornered");
    expect(prompt).toContain("Cyberpunk: Neon-lit megacorp dystopia");
    expect(prompt).toContain("Year 20: The war begins: Empire attacks");
    expect(prompt).toContain("[[suggest:character|Name|Appearance|Personality]]");
    expect(prompt).toContain("[[suggest:TYPE|name|description]]");
    expect(prompt).toContain("Do not propose a character, place, or theme that is already listed above as known");
  });

  it("handles empty entity lists gracefully", () => {
    const prompt = buildChatSystemPrompt(
      { premise: "" },
      { characters: [], places: [], themes: [], timelineEvents: [] }
    );
    expect(prompt).toContain("(none yet)");
  });

  it("appends the author's custom instructions when set", () => {
    const prompt = buildChatSystemPrompt(
      { premise: "A moon made of spice", systemPrompt: "Always write in first person." },
      { characters: [], places: [], themes: [], timelineEvents: [] }
    );
    expect(prompt).toContain("Additional instructions from the author:\nAlways write in first person.");
  });

  it("omits the author instructions section when systemPrompt is blank", () => {
    const prompt = buildChatSystemPrompt(
      { premise: "A moon made of spice", systemPrompt: "   " },
      { characters: [], places: [], themes: [], timelineEvents: [] }
    );
    expect(prompt).not.toContain("Additional instructions from the author");
  });
});

describe("buildProseSystemPrompt", () => {
  it("instructs an expanded, detailed rewrite rather than a thin transcription", () => {
    const prompt = buildProseSystemPrompt({ premise: "A moon made of spice" });
    expect(prompt).toContain("Expand the conversation below");
    expect(prompt).toContain("don't merely transcribe or lightly paraphrase");
  });

  it("includes known characters and places when provided, for consistency", () => {
    const prompt = buildProseSystemPrompt(
      { premise: "A moon made of spice" },
      {
        characters: [{ name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded but loyal" }],
        places: [{ name: "Docking bay", description: "A rusted freight platform" }],
      }
    );
    expect(prompt).toContain("Mira — Appearance: Scar over one eyebrow. Personality: Guarded but loyal.");
    expect(prompt).toContain("Docking bay: A rusted freight platform");
  });

  it("omits character/place sections when no entities are provided", () => {
    const prompt = buildProseSystemPrompt({ premise: "A moon made of spice" });
    expect(prompt).not.toContain("Known characters");
    expect(prompt).not.toContain("Known places");
  });
});

describe("buildQuickStartPrompt", () => {
  it("includes premise, existing entities, and the marker output instruction", () => {
    const prompt = buildQuickStartPrompt(
      { premise: "A moon made of spice" },
      {
        characters: [{ name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded but loyal" }],
        places: [{ name: "Docking bay", description: "Mira is cornered here" }],
        themes: [],
      }
    );
    expect(prompt).toContain("A moon made of spice");
    expect(prompt).toContain("Mira — Appearance: Scar over one eyebrow. Personality: Guarded but loyal.");
    expect(prompt).toContain("Docking bay: Mira is cornered here");
    expect(prompt).toContain("(none yet)");
    expect(prompt).toContain("[[suggest:character|Name|Appearance|Personality]]");
    expect(prompt).toContain("[[suggest:TYPE|name|description]]");
  });
});

describe("buildSuggestEntityPrompt", () => {
  it("asks for a single character marker with the given name", () => {
    const prompt = buildSuggestEntityPrompt(
      { premise: "A moon made of spice" },
      "character",
      "Zara",
      { characters: [], places: [], themes: [] }
    );
    expect(prompt).toContain('new character: "Zara"');
    expect(prompt).toContain("[[suggest:character|Zara|Appearance|Personality]]");
  });

  it("asks for a single place/theme marker with the given name", () => {
    const prompt = buildSuggestEntityPrompt(
      { premise: "A moon made of spice" },
      "place",
      "The Rust Market",
      { characters: [], places: [], themes: [] }
    );
    expect(prompt).toContain('new place: "The Rust Market"');
    expect(prompt).toContain("[[suggest:place|The Rust Market|description]]");
  });
});
