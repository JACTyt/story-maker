// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import type { SuggestionMarker } from "./suggestions";
import { selectNewSuggestions, loadDismissedKeys, rememberDismissedKey } from "./pendingSuggestions";

const mira: SuggestionMarker = { type: "character", name: "Mira", appearance: "Scarred brow", personality: "Guarded" };
const haven: SuggestionMarker = { type: "place", name: "Haven", description: "A rusted platform" };

describe("selectNewSuggestions", () => {
  it("keeps a suggestion that is unknown everywhere", () => {
    expect(selectNewSuggestions([mira], { existing: [], dismissed: [], pending: [] })).toEqual([mira]);
  });

  it("drops a suggestion whose entity is already in the bible", () => {
    expect(selectNewSuggestions([mira], { existing: ["character:mira"], dismissed: [], pending: [] })).toEqual([]);
  });

  it("matches bible entries regardless of case", () => {
    expect(selectNewSuggestions([mira], { existing: ["character:MIRA"], dismissed: [], pending: [] })).toEqual([]);
  });

  it("drops a suggestion the writer has already dismissed", () => {
    expect(selectNewSuggestions([mira], { existing: [], dismissed: ["character:mira"], pending: [] })).toEqual([]);
  });

  it("drops a suggestion already showing as a pending note", () => {
    expect(selectNewSuggestions([mira], { existing: [], dismissed: [], pending: ["character:mira"] })).toEqual([]);
  });

  it("keeps a same-named entity of a different type", () => {
    const themeMira: SuggestionMarker = { type: "theme", name: "Mira", description: "A motif" };
    expect(selectNewSuggestions([themeMira], { existing: ["character:mira"], dismissed: [], pending: [] })).toEqual([
      themeMira,
    ]);
  });

  it("removes duplicates within a single batch", () => {
    expect(selectNewSuggestions([mira, mira, haven], { existing: [], dismissed: [], pending: [] })).toEqual([
      mira,
      haven,
    ]);
  });
});

describe("dismissed key persistence", () => {
  beforeEach(() => localStorage.clear());

  it("recalls a dismissal for the same chapter", () => {
    rememberDismissedKey("7", "character:mira");

    expect(loadDismissedKeys("7")).toEqual(["character:mira"]);
  });

  it("keeps dismissals separate per chapter", () => {
    rememberDismissedKey("7", "character:mira");

    expect(loadDismissedKeys("8")).toEqual([]);
  });

  it("does not record the same dismissal twice", () => {
    rememberDismissedKey("7", "character:mira");
    rememberDismissedKey("7", "character:mira");

    expect(loadDismissedKeys("7")).toEqual(["character:mira"]);
  });

  it("returns no dismissals when the stored value is malformed", () => {
    localStorage.setItem("story-maker.dismissedSuggestions.7", "{not json");

    expect(loadDismissedKeys("7")).toEqual([]);
  });
});
