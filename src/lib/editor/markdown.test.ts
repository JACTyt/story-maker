// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import { proseExtensions } from "./extensions";
import { prepareProseMarkdown, finalizeProseMarkdown } from "./markdown";

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

function roundTrip(markdown: string): string {
  editor = new Editor({ extensions: proseExtensions(), content: prepareProseMarkdown(markdown), contentType: "markdown" });
  return finalizeProseMarkdown(editor.getMarkdown());
}

describe("prose markdown normalisation", () => {
  it("keeps dash-led dialogue as separate paragraphs, not a list", () => {
    expect(roundTrip("- Hello, she said.\n\n- Fine.")).toBe("- Hello, she said.\n\n- Fine.");
  });

  it("keeps numbered lines as text", () => {
    expect(roundTrip("1. First, the map.")).toBe("1. First, the map.");
  });

  it("does not mistake a scene break for a list item", () => {
    expect(roundTrip("One.\n\n* * *\n\nTwo.")).toBe("One.\n\n* * *\n\nTwo.");
  });

  it("stores ampersands and angle brackets as typed", () => {
    expect(roundTrip("Hale & Sons, 3 < 4")).toBe("Hale & Sons, 3 < 4");
  });

  it("is stable across repeated saves", () => {
    const once = roundTrip("- Hi & bye.\n\n*Thought.*");
    editor?.destroy();
    expect(roundTrip(once)).toBe(once);
  });
});
