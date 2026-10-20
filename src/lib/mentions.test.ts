import { describe, it, expect } from "vitest";
import { buildMatcher, findMentions, countMentions, parseEntityHref, stripEntityLinks, type MentionEntity } from "./mentions";

const ENTITIES: MentionEntity[] = [
  { type: "character", id: 1, names: ["Elizabeth Marlow", "Elizabeth", "Liz"] },
  { type: "character", id: 2, names: ["Tom Hale", "Tom", "Hale"] },
  { type: "character", id: 3, names: ["Edmund Hale", "Hale"] },
  { type: "character", id: 4, names: ["Will"] },
  { type: "place", id: 10, names: ["Old Harbour", "the harbour"] },
  { type: "place", id: 11, names: ["York"] },
  { type: "place", id: 12, names: ["New York"] },
  { type: "timeline", id: 20, names: ["Night of the Storm", "the storm"] },
];
const matcher = buildMatcher(ENTITIES);
const texts = (s: string) => findMentions(s, matcher).map((m) => s.slice(m.from, m.to));

describe("findMentions", () => {
  it("matches names and aliases as whole words", () => {
    expect(texts("Liz met Tom. Tomas did not.")).toEqual(["Liz", "Tom"]);
  });

  it("matches possessives", () => {
    const [m] = findMentions("Elizabeth's map", matcher);
    expect(m).toMatchObject({ from: 0, to: 9, keys: ["character:1"] });
  });

  it("prefers the longest match", () => {
    expect(findMentions("They sailed to New York.", matcher).map((m) => m.keys)).toEqual([["place:12"]]);
    expect(texts("Elizabeth Marlow arrived")).toEqual(["Elizabeth Marlow"]);
  });

  it("is case-sensitive for capitalised names, insensitive for lowercase aliases", () => {
    expect(texts("You will see Will.")).toEqual(["Will"]);
    expect(texts("The Harbour and the harbour")).toEqual(["The Harbour", "the harbour"]);
  });

  it("flags a name shared by several entities as ambiguous", () => {
    const [m] = findMentions("Hale coughed.", matcher);
    expect(m.keys.sort()).toEqual(["character:2", "character:3"]);
  });

  it("works with non-latin letters at word boundaries", () => {
    const m = buildMatcher([{ type: "character", id: 9, names: ["Олена"] }]);
    expect(findMentions("Олена пішла. Оленка ні.", m)).toHaveLength(1);
  });

  it("returns nothing for an empty bible", () => {
    expect(findMentions("Anything", buildMatcher([]))).toEqual([]);
  });
});

describe("entity links", () => {
  it("parses entity hrefs", () => {
    expect(parseEntityHref("entity:character/12")).toEqual({ type: "character", id: 12 });
    expect(parseEntityHref("entity:none")).toBe("none");
    expect(parseEntityHref("https://example.com")).toBeNull();
  });

  it("strips entity links to their text for export", () => {
    expect(stripEntityLinks("By [the old man](entity:character/3) and a [rose](entity:none).")).toBe(
      "By the old man and a rose."
    );
  });
});

describe("countMentions", () => {
  it("counts auto and manual mentions per entity, skipping suppressed spans and ambiguous names", () => {
    const md = "Liz saw *Tom*. [the ferryman](entity:character/2) waved. [Liz](entity:none) the cat. Hale.";
    const counts = countMentions(md, matcher);
    expect(counts.get("character:1")).toBe(1);
    expect(counts.get("character:2")).toBe(2);
    expect(counts.has("character:3")).toBe(false);
  });
});
