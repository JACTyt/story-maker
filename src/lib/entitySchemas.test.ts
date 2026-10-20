import { describe, it, expect } from "vitest";
import { characterCreate, characterUpdate } from "./entitySchemas";

describe("entity schemas", () => {
  it("normalises aliases: trimmed, empties dropped, case-insensitive duplicates removed", () => {
    const parsed = characterCreate.parse({ name: "Elizabeth", aliases: [" Liz ", "", "liz", "Beth"] });
    expect(parsed.aliases).toEqual(["Liz", "Beth"]);
  });

  it("requires a name on create but not on update", () => {
    expect(characterCreate.safeParse({ summary: "x" }).success).toBe(false);
    expect(characterUpdate.safeParse({ summary: "x" }).success).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(characterUpdate.safeParse({ role: "villain" }).success).toBe(false);
  });
});
