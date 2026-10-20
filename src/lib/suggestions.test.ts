import { describe, it, expect } from "vitest";
import { parseSuggestionMarkers, stripSuggestionMarkers, suggestionKey } from "./suggestions";

describe("parseSuggestionMarkers", () => {
  it("extracts a 4-part character marker plus 3-part markers, in document order", () => {
    const text = [
      "Here are some ideas.",
      "[[suggest:character|Mira|Weathered leather jacket, scar over one eyebrow|Guarded but fiercely loyal]]",
      "[[suggest:place|Docking bay|A rusted freight platform on the edge of the ring station]]",
      "[[suggest:theme|Cyberpunk|Neon-lit megacorp dystopia]]",
    ].join("\n");

    expect(parseSuggestionMarkers(text)).toEqual([
      {
        type: "character",
        name: "Mira",
        appearance: "Weathered leather jacket, scar over one eyebrow",
        personality: "Guarded but fiercely loyal",
      },
      { type: "place", name: "Docking bay", description: "A rusted freight platform on the edge of the ring station" },
      { type: "theme", name: "Cyberpunk", description: "Neon-lit megacorp dystopia" },
    ]);
  });

  it("preserves original order when a character marker appears after other markers", () => {
    const text = [
      "[[suggest:theme|Cyberpunk|Neon-lit megacorp dystopia]]",
      "[[suggest:character|Jax|A grizzled pilot|Quietly reckless]]",
    ].join("\n");

    expect(parseSuggestionMarkers(text).map((m) => m.name)).toEqual(["Cyberpunk", "Jax"]);
  });

  it("returns an empty array when there are no markers", () => {
    expect(parseSuggestionMarkers("Just plain prose, nothing structured.")).toEqual([]);
  });
});

describe("parseSuggestionMarkers — tolerant parsing", () => {
  it("promotes a 2-field character marker's description into appearance", () => {
    const text = "[[suggest:character|Mira|A guarded smuggler with a scarred brow]]";

    expect(parseSuggestionMarkers(text)).toEqual([
      { type: "character", name: "Mira", appearance: "A guarded smuggler with a scarred brow", personality: "" },
    ]);
  });

  it("folds extra fields beyond the third into personality", () => {
    const text = "[[suggest:character|Mira|Scarred brow|Guarded|Ex-smuggler]]";

    expect(parseSuggestionMarkers(text)).toEqual([
      { type: "character", name: "Mira", appearance: "Scarred brow", personality: "Guarded Ex-smuggler" },
    ]);
  });

  it("folds extra fields beyond the second into description for non-character types", () => {
    const text = "[[suggest:place|Docking bay|A rusted platform|On the ring station]]";

    expect(parseSuggestionMarkers(text)).toEqual([
      { type: "place", name: "Docking bay", description: "A rusted platform On the ring station" },
    ]);
  });

  it("drops a marker with only a name and no detail", () => {
    expect(parseSuggestionMarkers("[[suggest:character|Mira]]")).toEqual([]);
  });

  it("drops a marker whose type is not recognised", () => {
    expect(parseSuggestionMarkers("[[suggest:weapon|Rusted knife|Chipped blade]]")).toEqual([]);
  });

  it("ignores whitespace padding around the type and fields", () => {
    expect(parseSuggestionMarkers("[[suggest: theme | Cyberpunk | Neon dystopia ]]")).toEqual([
      { type: "theme", name: "Cyberpunk", description: "Neon dystopia" },
    ]);
  });
});

describe("stripSuggestionMarkers", () => {
  it("removes markers and collapses the whitespace they leave behind", () => {
    const text = "Good idea. [[suggest:character|Mira|Scarred brow|Guarded]] Shall we continue?";

    expect(stripSuggestionMarkers(text)).toBe("Good idea. Shall we continue?");
  });

  it("returns prose containing no markers unchanged", () => {
    expect(stripSuggestionMarkers("Just plain prose.")).toBe("Just plain prose.");
  });

  it("removes a malformed marker that the parser would reject", () => {
    expect(stripSuggestionMarkers("Before [[suggest:character|Mira]] after")).toBe("Before after");
  });
});

describe("suggestionKey", () => {
  it("matches the same entity regardless of case and surrounding whitespace", () => {
    expect(suggestionKey({ type: "character", name: "  MIRA ", appearance: "a", personality: "b" })).toBe(
      suggestionKey({ type: "character", name: "mira", appearance: "x", personality: "y" })
    );
  });

  it("distinguishes entities that share a name but differ in type", () => {
    expect(suggestionKey({ type: "place", name: "Haven", description: "a" })).not.toBe(
      suggestionKey({ type: "theme", name: "Haven", description: "a" })
    );
  });
});

describe("parseSuggestionMarkers — reporting dropped markers", () => {
  it("reports the body of a marker it could not use", () => {
    const dropped: string[] = [];

    parseSuggestionMarkers("[[suggest:weapon|Rusted knife|Chipped blade]]", (body) => dropped.push(body));

    expect(dropped).toEqual(["weapon|Rusted knife|Chipped blade"]);
  });

  it("reports nothing when every marker parses", () => {
    const dropped: string[] = [];

    parseSuggestionMarkers("[[suggest:theme|Cyberpunk|Neon dystopia]]", (body) => dropped.push(body));

    expect(dropped).toEqual([]);
  });
});

describe("keyed extra fields", () => {
  it("reads role, summary and aliases from key=value fields without disturbing positional ones", () => {
    const [m] = parseSuggestionMarkers(
      "[[suggest:character|Elizabeth|Tall, ink-stained|Stubborn|role=protagonist|summary=Runs from debts.|aliases=Liz, Beth]]"
    );
    expect(m).toMatchObject({
      type: "character",
      name: "Elizabeth",
      appearance: "Tall, ink-stained",
      personality: "Stubborn",
      role: "protagonist",
      summary: "Runs from debts.",
      aliases: ["Liz", "Beth"],
    });
  });

  it("reads kind for places and ignores an unknown role", () => {
    const [place] = parseSuggestionMarkers("[[suggest:place|Old Harbour|Tar and gulls|kind=district|aliases=the harbour]]");
    expect(place).toMatchObject({ type: "place", description: "Tar and gulls", kind: "district", aliases: ["the harbour"] });
    const [c] = parseSuggestionMarkers("[[suggest:character|Tom|Lean|Quiet|role=villain]]");
    expect(c).not.toHaveProperty("role");
  });
});
