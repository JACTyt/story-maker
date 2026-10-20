// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import { proseExtensions } from "./extensions";
import { EntityMentions, setMentionMatcher, setMentionFocus } from "./entityMentions";
import { buildMatcher } from "@/lib/mentions";

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

const matcher = buildMatcher([
  { type: "character", id: 1, names: ["Elizabeth", "Liz"] },
  { type: "character", id: 2, names: ["Tom Hale", "Tom", "Hale"] },
  { type: "character", id: 3, names: ["Edmund Hale", "Hale"] },
  { type: "place", id: 10, names: ["Old Harbour"] },
]);

function mount(markdown: string) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  editor = new Editor({ element: el, extensions: proseExtensions({ extra: [EntityMentions] }), content: markdown, contentType: "markdown" });
  setMentionMatcher(editor, matcher);
  return el;
}

const mentions = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>(".mention")].map((m) => ({ text: m.textContent, cls: m.className, keys: m.dataset.keys }));

describe("EntityMentions", () => {
  it("decorates auto-matched names with their type and key", () => {
    const el = mount("Liz reached the Old Harbour.");
    expect(mentions(el)).toEqual([
      { text: "Liz", cls: "mention t-character auto", keys: "character:1" },
      { text: "Old Harbour", cls: "mention t-place auto", keys: "place:10" },
    ]);
  });

  it("underlines only the first mention of an entity per paragraph", () => {
    const el = mount("Liz and Elizabeth.\n\nLiz again.");
    expect(mentions(el).map((m) => m.cls)).toEqual([
      "mention t-character auto",
      "mention t-character auto quiet",
      "mention t-character auto",
    ]);
  });

  it("marks shared names as ambiguous", () => {
    const el = mount("Hale coughed.");
    expect(mentions(el)[0]).toMatchObject({ cls: "mention t-character auto ambiguous", keys: "character:2 character:3" });
  });

  it("treats entity links as manual mentions and never auto-matches inside them", () => {
    const el = mount("[the old man](entity:character/3) and [Liz](entity:none) the cat.");
    expect(mentions(el)).toEqual([{ text: "the old man", cls: "mention t-character manual", keys: "character:3" }]);
  });

  it("re-highlights as the text changes", () => {
    const el = mount("Nobody here.");
    editor!.commands.insertContent(" Tom arrives.");
    expect(mentions(el).map((m) => m.text)).toEqual(["Tom"]);
  });

  it("marks every mention of the focused entity", () => {
    const el = mount("Liz and Elizabeth.");
    setMentionFocus(editor!, "character:1");
    expect(mentions(el).every((m) => m.cls.includes("focus"))).toBe(true);
  });

  it("keeps decorations out of the saved markdown", () => {
    mount("Liz reached the Old Harbour.");
    expect(editor!.getMarkdown().trim()).toBe("Liz reached the Old Harbour.");
  });
});
