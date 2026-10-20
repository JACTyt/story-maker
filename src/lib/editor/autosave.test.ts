import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAutosave } from "./autosave";

describe("createAutosave", () => {
  let drafts: string[];
  let versions: string[];
  let clock: number;

  beforeEach(() => {
    vi.useFakeTimers();
    drafts = [];
    versions = [];
    clock = 0;
  });
  afterEach(() => vi.useRealTimers());

  function make() {
    return createAutosave({
      saveDraft: (c) => void drafts.push(c),
      saveVersion: (c) => void versions.push(c),
      now: () => clock,
    });
  }

  function advance(ms: number) {
    clock += ms;
    vi.advanceTimersByTime(ms);
  }

  it("saves a draft once typing pauses for 1.5s, debouncing keystrokes", () => {
    const a = make();
    a.change("H");
    advance(1000);
    a.change("He");
    advance(1499);
    expect(drafts).toEqual([]);
    advance(1);
    expect(drafts).toEqual(["He"]);
    expect(versions).toEqual([]);
  });

  it("cuts a version instead of a draft once 5 minutes passed since the last version", () => {
    const a = make();
    advance(5 * 60_000);
    a.change("Later text");
    advance(1500);
    expect(versions).toEqual(["Later text"]);
    expect(drafts).toEqual([]);
  });

  it("saveNow versions pending changes immediately and only once", () => {
    const a = make();
    a.change("Draft");
    a.saveNow();
    a.saveNow();
    advance(5000);
    expect(versions).toEqual(["Draft"]);
    expect(drafts).toEqual([]);
  });

  it("flush on leave versions unsaved work, and does nothing when clean", () => {
    const a = make();
    a.flush();
    expect(versions).toEqual([]);
    a.change("Unsaved");
    advance(1500);
    a.flush();
    expect(versions).toEqual(["Unsaved"]);
  });

  it("markVersioned resets the clock and clears pending work (after generate or revert)", () => {
    const a = make();
    a.change("Typed");
    a.markVersioned("Generated");
    a.flush();
    expect(versions).toEqual([]);
  });
});
