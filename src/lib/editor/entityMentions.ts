import { Extension, type Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { buildMatcher, entityKey, findMentions, parseEntityHref, parseEntityKey, type Matcher } from "@/lib/mentions";

type MentionState = { matcher: Matcher; focusKey: string | null; decorations: DecorationSet };
type MentionMeta = { matcher?: Matcher; focusKey?: string | null };

export const entityMentionsKey = new PluginKey<MentionState>("entityMentions");

type Span = { from: number; to: number; keys: string[]; manual: boolean };

/**
 * Mentions inside one paragraph, in text offsets. Manual entity links win over
 * auto-matching; an `entity:none` link suppresses matching for its text.
 */
function blockSpans(block: PmNode, matcher: Matcher): Span[] {
  let text = "";
  const linked: { from: number; to: number; target: ReturnType<typeof parseEntityHref> }[] = [];
  block.forEach((child, offset) => {
    if (child.isText) {
      const href = child.marks.find((m) => m.type.name === "link")?.attrs.href as string | undefined;
      const target = href ? parseEntityHref(href) : null;
      if (target) {
        const last = linked[linked.length - 1];
        // A link split across formatting (e.g. partly italic) is one mention.
        if (last && last.to === offset && JSON.stringify(last.target) === JSON.stringify(target)) last.to += child.nodeSize;
        else linked.push({ from: offset, to: offset + child.nodeSize, target });
      }
      text += child.text ?? "";
    } else {
      text += "￼".repeat(child.nodeSize);
    }
  });

  const spans: Span[] = linked
    .filter((l) => l.target !== "none")
    .map((l) => {
      const target = l.target as { type: Parameters<typeof entityKey>[0]; id: number };
      return { from: l.from, to: l.to, keys: [entityKey(target.type, target.id)], manual: true };
    });
  for (const m of findMentions(text, matcher)) {
    if (linked.some((l) => m.from < l.to && l.from < m.to)) continue;
    spans.push({ ...m, manual: false });
  }
  return spans.sort((a, b) => a.from - b.from);
}

export function mentionDecorations(doc: PmNode, matcher: Matcher, focusKey: string | null): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const seen = new Set<string>();
    for (const span of blockSpans(node, matcher)) {
      const ambiguous = span.keys.length > 1;
      const quiet = !ambiguous && seen.has(span.keys[0]);
      span.keys.forEach((k) => seen.add(k));
      const classes = [
        "mention",
        `t-${parseEntityKey(span.keys[0]).type}`,
        span.manual ? "manual" : "auto",
        ambiguous ? "ambiguous" : "",
        quiet ? "quiet" : "",
        focusKey && span.keys.includes(focusKey) ? "focus" : "",
      ];
      decorations.push(
        Decoration.inline(pos + 1 + span.from, pos + 1 + span.to, {
          class: classes.filter(Boolean).join(" "),
          "data-keys": span.keys.join(" "),
        })
      );
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

/**
 * Highlights bible entities in the prose. Purely visual: decorations never
 * enter the document, so the saved markdown stays clean.
 */
export const EntityMentions = Extension.create({
  name: "entityMentions",
  addProseMirrorPlugins() {
    return [
      new Plugin<MentionState>({
        key: entityMentionsKey,
        state: {
          init: (_config, state) => {
            const matcher = buildMatcher([]);
            return { matcher, focusKey: null, decorations: mentionDecorations(state.doc, matcher, null) };
          },
          apply: (tr, prev, _old, state) => {
            const meta = tr.getMeta(entityMentionsKey) as MentionMeta | undefined;
            if (!meta && !tr.docChanged) return prev;
            const matcher = meta?.matcher ?? prev.matcher;
            const focusKey = meta && "focusKey" in meta ? (meta.focusKey ?? null) : prev.focusKey;
            return { matcher, focusKey, decorations: mentionDecorations(state.doc, matcher, focusKey) };
          },
        },
        props: {
          decorations: (state) => entityMentionsKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

export function setMentionMatcher(editor: Editor, matcher: Matcher): void {
  editor.view.dispatch(editor.state.tr.setMeta(entityMentionsKey, { matcher } satisfies MentionMeta));
}

export function setMentionFocus(editor: Editor, focusKey: string | null): void {
  editor.view.dispatch(editor.state.tr.setMeta(entityMentionsKey, { focusKey } satisfies MentionMeta));
}
