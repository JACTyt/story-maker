import { describe, it, expect } from "vitest";
import { parseSuggestionMarkers } from "./suggestions";

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
