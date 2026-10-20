import { Extension, type AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";

/** Scene breaks are written the way novelists type them, not as a markdown thematic break. */
const SceneBreak = HorizontalRule.extend({
  renderMarkdown: () => "* * *",
});

/**
 * Models sometimes open a chapter with a heading despite being told not to.
 * There is no heading node in this schema, so without this the text would be
 * silently dropped; it is kept as an ordinary paragraph instead.
 */
const HeadingAsParagraph = Extension.create({
  name: "headingAsParagraph",
  markdownTokenName: "heading",
  parseMarkdown: (token, helpers) => helpers.createNode("paragraph", {}, helpers.parseInline(token.tokens ?? [])),
});

/**
 * The prose editor's schema: the formatting set the generation prompt asks for
 * and nothing more, so what the model writes and what the toolbar offers agree.
 */
export function proseExtensions(
  options: { placeholder?: string; extra?: AnyExtension[]; headings?: boolean } = {}
): AnyExtension[] {
  return [
    StarterKit.configure({
      // Only the compiled manuscript has headings (one per chapter).
      heading: options.headings ? { levels: [1, 2] } : false,
      code: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      strike: false,
      horizontalRule: false,
      link: {
        // Entity links use their own scheme; they are references, never navigation.
        protocols: ["entity"],
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        HTMLAttributes: { rel: null, target: null, class: null },
      },
    }),
    SceneBreak,
    ...(options.headings ? [] : [HeadingAsParagraph]),
    Markdown,
    ...(options.placeholder ? [Placeholder.configure({ placeholder: options.placeholder })] : []),
    ...(options.extra ?? []),
  ];
}
