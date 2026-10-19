import { describe, it, expect } from "vitest";
import { diffLines } from "./diff";

describe("diffLines", () => {
  it("marks identical text as unchanged", () => {
    expect(diffLines("one\ntwo", "one\ntwo")).toEqual([
      { type: "same", text: "one" },
      { type: "same", text: "two" },
    ]);
  });

  it("marks an appended line as added", () => {
    expect(diffLines("one", "one\ntwo")).toEqual([
      { type: "same", text: "one" },
      { type: "added", text: "two" },
    ]);
  });

  it("marks a deleted line as removed", () => {
    expect(diffLines("one\ntwo", "one")).toEqual([
      { type: "same", text: "one" },
      { type: "removed", text: "two" },
    ]);
  });

  it("reports a changed line as a removal followed by an addition", () => {
    expect(diffLines("one\ntwo\nthree", "one\nTWO\nthree")).toEqual([
      { type: "same", text: "one" },
      { type: "removed", text: "two" },
      { type: "added", text: "TWO" },
      { type: "same", text: "three" },
    ]);
  });

  it("keeps the longest common run rather than rewriting everything", () => {
    const result = diffLines("a\nb\nc\nd", "a\nx\nc\nd");

    expect(result.filter((d) => d.type === "same").map((d) => d.text)).toEqual(["a", "c", "d"]);
  });

  it("treats an empty original as all additions", () => {
    expect(diffLines("", "one")).toEqual([{ type: "added", text: "one" }]);
  });

  it("reports no changes between two empty texts", () => {
    expect(diffLines("", "")).toEqual([]);
  });
});
