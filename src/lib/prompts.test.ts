import { describe, it, expect } from "vitest";
import { buildChatSystemPrompt, buildProseSystemPrompt, buildQuickStartPrompt, buildSuggestEntityPrompt } from "./prompts";

describe("buildChatSystemPrompt", () => {
  it("includes premise, the story bible, and the suggestion format", () => {
    const prompt = buildChatSystemPrompt({ premise: "A moon made of spice" }, "In this chapter:\n- Mira — guarded");
    expect(prompt).toContain("A moon made of spice");
    expect(prompt).toContain("- Mira — guarded");
    expect(prompt).toContain("[[suggest:character|Name|Appearance|Personality]]");
    expect(prompt).toContain("[[suggest:TYPE|name|description]]");
    expect(prompt).toContain("Do not propose a character, place, or theme that is already in the story bible above");
    expect(prompt).toContain("aliases=");
  });

  it("appends the author's custom instructions when set", () => {
    const prompt = buildChatSystemPrompt({ premise: "x", systemPrompt: "Always write in first person." }, "");
    expect(prompt).toContain("Additional instructions from the author:\nAlways write in first person.");
  });

  it("omits the author instructions section when systemPrompt is blank", () => {
    const prompt = buildChatSystemPrompt({ premise: "x", systemPrompt: "   " }, "");
    expect(prompt).not.toContain("Additional instructions from the author");
  });
});

describe("buildProseSystemPrompt", () => {
  it("instructs an expanded, detailed rewrite rather than a thin transcription", () => {
    const prompt = buildProseSystemPrompt({ premise: "A moon made of spice" });
    expect(prompt).toContain("Expand the conversation below");
    expect(prompt).toContain("don't merely transcribe or lightly paraphrase");
  });

  it("includes the story bible when provided, for consistency", () => {
    const prompt = buildProseSystemPrompt({ premise: "x" }, "- Mira — Appearance: Scar");
    expect(prompt).toContain("Story bible (stay consistent with every established detail):");
    expect(prompt).toContain("- Mira — Appearance: Scar");
  });

  it("omits the bible section when none is provided", () => {
    expect(buildProseSystemPrompt({ premise: "x" })).not.toContain("Story bible");
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

describe("prose formatting instruction", () => {
  it("tells the model exactly which markdown the editor supports", () => {
    const prompt = buildProseSystemPrompt({ premise: "p" });
    expect(prompt).toContain("* * *");
    expect(prompt).toContain("*italic*");
    expect(prompt).toContain("> blockquotes");
    expect(prompt).toMatch(/Do not use headings/);
  });
});
