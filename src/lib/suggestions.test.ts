import { describe, it, expect } from "vitest";
import { parseSuggestionMarkers } from "./suggestions";

describe("parseSuggestionMarkers", () => {
  it("extracts multiple markers across types from a block of text", () => {
    const text = [
      "Here are some ideas.",
      "[[suggest:character|Mira|A smuggler with a grudge]]",
      "[[suggest:scene|Docking bay ambush|Mira is cornered]]",
      "[[suggest:theme|Betrayal|Trust broken]]",
    ].join("\n");

    expect(parseSuggestionMarkers(text)).toEqual([
      { type: "character", name: "Mira", description: "A smuggler with a grudge" },
      { type: "scene", name: "Docking bay ambush", description: "Mira is cornered" },
      { type: "theme", name: "Betrayal", description: "Trust broken" },
    ]);
  });

  it("returns an empty array when there are no markers", () => {
    expect(parseSuggestionMarkers("Just plain prose, nothing structured.")).toEqual([]);
  });
});
