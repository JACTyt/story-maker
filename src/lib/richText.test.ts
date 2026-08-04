import { describe, it, expect } from "vitest";
import { parseRichText } from "./richText";

describe("parseRichText", () => {
  it("returns a single plain segment for plain text with no places", () => {
    expect(parseRichText("Mira crept aboard the freighter.", [])).toEqual([
      { text: "Mira crept aboard the freighter.", bold: false, italic: false },
    ]);
  });

  it("parses bold and italic markdown spans", () => {
    const segments = parseRichText("It was **dark** and *quiet*.", []);
    expect(segments).toEqual([
      { text: "It was ", bold: false, italic: false },
      { text: "dark", bold: true, italic: false },
      { text: " and ", bold: false, italic: false },
      { text: "quiet", bold: false, italic: true },
      { text: ".", bold: false, italic: false },
    ]);
  });

  it("wraps a case-insensitive whole-word place mention with its description", () => {
    const segments = parseRichText("She reached the Docking Bay at dusk.", [
      { name: "docking bay", description: "A rusted freight platform" },
    ]);
    expect(segments).toContainEqual({
      text: "Docking Bay",
      bold: false,
      italic: false,
      placeDescription: "A rusted freight platform",
    });
  });

  it("does not match a place name that only appears as part of another word", () => {
    const segments = parseRichText("The Bayou was quiet.", [{ name: "Bay", description: "A place" }]);
    expect(segments.some((s) => s.placeDescription)).toBe(false);
  });

  it("preserves bold/italic flags on a place mention split out of a formatted span", () => {
    const segments = parseRichText("**The Docking Bay loomed.**", [
      { name: "Docking Bay", description: "A rusted freight platform" },
    ]);
    expect(segments).toContainEqual({
      text: "Docking Bay",
      bold: true,
      italic: false,
      placeDescription: "A rusted freight platform",
    });
  });

  it("matches the longer of two overlapping place names", () => {
    const segments = parseRichText("The Docking Bay Annex was empty.", [
      { name: "Docking Bay", description: "Short match" },
      { name: "Docking Bay Annex", description: "Long match" },
    ]);
    const placeSegments = segments.filter((s) => s.placeDescription);
    expect(placeSegments).toHaveLength(1);
    expect(placeSegments[0]).toMatchObject({ text: "Docking Bay Annex", placeDescription: "Long match" });
  });
});
