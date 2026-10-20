// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import { proseExtensions } from "./extensions";

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

function roundTrip(markdown: string): string {
  editor = new Editor({ extensions: proseExtensions(), content: markdown, contentType: "markdown" });
  return editor.getMarkdown().trim();
}

describe("prose markdown round-trip", () => {
  it("keeps italic, bold and underline", () => {
    expect(roundTrip("She *thought* it was **over**, and ++meant++ it.")).toBe(
      "She *thought* it was **over**, and ++meant++ it."
    );
  });

  it("writes scene breaks as * * *, whichever form came in", () => {
    expect(roundTrip("One.\n\n---\n\nTwo.")).toBe("One.\n\n* * *\n\nTwo.");
    expect(roundTrip("One.\n\n* * *\n\nTwo.")).toBe("One.\n\n* * *\n\nTwo.");
  });

  it("keeps blockquotes", () => {
    expect(roundTrip("> Departed: the *Gull*.")).toBe("> Departed: the *Gull*.");
  });

  it("keeps entity links, including the suppressing entity:none form", () => {
    expect(roundTrip("Then [the old man](entity:character/3) coughed by a [rose](entity:none).")).toBe(
      "Then [the old man](entity:character/3) coughed by a [rose](entity:none)."
    );
  });

  it("demotes headings to paragraphs, since chapters carry no inner headings", () => {
    expect(roundTrip("# Title\n\nBody.")).toBe("Title\n\nBody.");
  });
});
