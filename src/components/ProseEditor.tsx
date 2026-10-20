"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  Quote,
  Redo2,
  SeparatorHorizontal,
  Underline,
  Undo2,
  UserPlus,
} from "lucide-react";
import { proseExtensions } from "@/lib/editor/extensions";
import { EntityMentions, setMentionFocus, setMentionMatcher } from "@/lib/editor/entityMentions";
import { finalizeProseMarkdown, prepareProseMarkdown } from "@/lib/editor/markdown";
import { entityHref, parseEntityKey, type Matcher } from "@/lib/mentions";
import type { EntityView } from "@/lib/bibleClient";
import { EntityPicker, Portrait, TypeChip } from "./EntityBits";

export type ProseEditorProps = {
  /** Markdown to show. Replaces the document whenever `contentKey` changes. */
  content: string;
  contentKey: number;
  editable?: boolean;
  /** Keep # headings (compiled manuscript); chapters flatten them. */
  headings?: boolean;
  /** Read-only views (compiled story) hide the toolbar. */
  showToolbar?: boolean;
  highlights: boolean;
  onHighlightsChange?: (on: boolean) => void;
  matcher: Matcher;
  views: EntityView[];
  byKey: Map<string, EntityView>;
  portraitFor: (key: string) => string | null;
  appearancesFor?: (key: string) => number;
  focusKey?: string | null;
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onOpenEntity?: (key: string) => void;
  onCreateEntity?: (name: string) => void;
  onSaveShortcut?: () => void;
  toolbarEnd?: React.ReactNode;
  /** Rendered above the text inside the scrolling page (chapter title, header image). */
  header?: React.ReactNode;
};

type HoverState = { keys: string[]; x: number; y: number; span: HTMLElement };

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm disabled:opacity-35 ${
        active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  editable,
  highlights,
  onHighlightsChange,
  onLink,
  onCreateEntity,
  toolbarEnd,
}: {
  editor: Editor;
  editable: boolean;
  highlights: boolean;
  onHighlightsChange?: (on: boolean) => void;
  onLink: () => void;
  onCreateEntity?: () => void;
  toolbarEnd?: React.ReactNode;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      hasSelection: !e.state.selection.empty,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const off = !editable;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface px-3 py-1.5" role="toolbar" aria-label="Formatting">
      <ToolButton label="Bold (Ctrl+B)" active={state.bold} disabled={off} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={15} />
      </ToolButton>
      <ToolButton label="Italic (Ctrl+I)" active={state.italic} disabled={off} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={15} />
      </ToolButton>
      <ToolButton label="Underline (Ctrl+U)" active={state.underline} disabled={off} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline size={15} />
      </ToolButton>
      <ToolButton label="Blockquote" active={state.quote} disabled={off} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={15} />
      </ToolButton>
      <ToolButton label="Scene break" disabled={off} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <SeparatorHorizontal size={15} />
      </ToolButton>
      <ToolButton label="Undo (Ctrl+Z)" disabled={off || !state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={15} />
      </ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={off || !state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={15} />
      </ToolButton>
      <span className="mx-1.5 h-5 w-px bg-line" />
      <ToolButton label="Link selection to an entity" disabled={off || !state.hasSelection} onClick={onLink}>
        <Link2 size={15} /> <span className="text-xs">Link</span>
      </ToolButton>
      <ToolButton
        label={state.link ? "Remove link" : "Don't highlight this text"}
        disabled={off || (!state.hasSelection && !state.link)}
        onClick={() => {
          if (editor.isActive("link")) editor.chain().focus().extendMarkRange("link").unsetLink().run();
          else editor.chain().focus().setLink({ href: "entity:none" }).run();
        }}
      >
        <Link2Off size={15} /> <span className="text-xs">Unlink</span>
      </ToolButton>
      {onCreateEntity && (
        <ToolButton label="Create an entity from the selection" disabled={off || !state.hasSelection} onClick={onCreateEntity}>
          <UserPlus size={15} /> <span className="text-xs">Entity</span>
        </ToolButton>
      )}
      <span className="mx-1.5 h-5 w-px bg-line" />
      <ToolButton label={highlights ? "Hide highlights" : "Show highlights"} active={highlights} onClick={() => onHighlightsChange?.(!highlights)}>
        <Highlighter size={15} />
      </ToolButton>
      <span className="flex-1" />
      {toolbarEnd}
    </div>
  );
}

export function ProseEditor({
  content,
  contentKey,
  editable = true,
  showToolbar = true,
  headings = false,
  highlights,
  onHighlightsChange,
  matcher,
  views,
  byKey,
  portraitFor,
  appearancesFor,
  focusKey = null,
  placeholder,
  onChange,
  onOpenEntity,
  onCreateEntity,
  onSaveShortcut,
  toolbarEnd,
  header,
}: ProseEditorProps) {
  // The editor is created once; these refs let its callbacks see the latest props.
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSaveShortcut);
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSaveShortcut;
  });

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: proseExtensions({ placeholder, headings, extra: [EntityMentions] }),
    content: prepareProseMarkdown(content),
    contentType: "markdown",
    editable,
    editorProps: {
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          onSaveRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChangeRef.current?.(finalizeProseMarkdown(e.getMarkdown())),
  });

  // External replacements (generation stream, revert, chapter switch) must not echo back as edits.
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(prepareProseMarkdown(content), { contentType: "markdown", emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, contentKey]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) setMentionMatcher(editor, matcher);
  }, [editor, matcher]);

  useEffect(() => {
    if (editor) setMentionFocus(editor, focusKey);
  }, [editor, focusKey]);

  // ---------- hover card ----------
  const [hover, setHover] = useState<HoverState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepHover = () => hideTimer.current && clearTimeout(hideTimer.current);
  const dropHover = () => {
    keepHover();
    hideTimer.current = setTimeout(() => setHover(null), 180);
  };

  const onMouseOver = useCallback(
    (e: React.MouseEvent) => {
      if (!highlights) return;
      const span = (e.target as HTMLElement).closest<HTMLElement>(".mention");
      if (!span?.dataset.keys) return;
      keepHover();
      const rect = span.getBoundingClientRect();
      setHover({ keys: span.dataset.keys.split(" "), x: rect.left, y: rect.bottom, span });
    },
    [highlights]
  );

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (!highlights) return;
      const span = (e.target as HTMLElement).closest<HTMLElement>(".mention");
      const keys = span?.dataset.keys?.split(" ");
      if (keys?.length === 1 && (e.ctrlKey || e.metaKey || !editable)) onOpenEntity?.(keys[0]);
    },
    [editable, highlights, onOpenEntity]
  );

  /** Resolves an ambiguous name by writing a manual link over that exact span. */
  function linkSpan(span: HTMLElement, key: string) {
    if (!editor) return;
    const from = editor.view.posAtDOM(span, 0);
    const to = from + (span.textContent?.length ?? 0);
    const { type, id } = parseEntityKey(key);
    editor.chain().focus().setTextSelection({ from, to }).setLink({ href: entityHref(type, id) }).run();
    setHover(null);
  }

  // ---------- link picker ----------
  const [picker, setPicker] = useState<{ query: string } | null>(null);

  if (!editor) return <div className="flex-1" />;

  const selectionText = () => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ").trim();
  };

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${highlights ? "" : "highlights-off"}`}>
      {showToolbar && (
        <Toolbar
          editor={editor}
          editable={editable}
          highlights={highlights}
          onHighlightsChange={onHighlightsChange}
          onLink={() => setPicker({ query: selectionText() })}
          onCreateEntity={onCreateEntity ? () => onCreateEntity(selectionText()) : undefined}
          toolbarEnd={toolbarEnd}
        />
      )}
      {picker && (
        <div className="absolute left-1/2 top-12 z-30 -translate-x-1/2">
          <EntityPicker
            views={views}
            portraitFor={portraitFor}
            initialQuery={picker.query}
            onClose={() => setPicker(null)}
            onPick={(v) => {
              editor.chain().focus().setLink({ href: entityHref(v.type, v.id) }).run();
              setPicker(null);
            }}
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto" onMouseOver={onMouseOver} onMouseOut={dropHover} onClick={onClick}>
        <div className="mx-auto max-w-[44rem] px-8 pb-40 pt-10">
          {header}
          <EditorContent editor={editor} className="prose-page" />
        </div>
      </div>
      {hover && (
        <div
          className="fixed z-40 w-96 rounded-xl border border-line bg-surface p-1.5 shadow-soft"
          style={{ left: Math.min(hover.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 400), top: hover.y + 6 }}
          onMouseEnter={keepHover}
          onMouseLeave={dropHover}
        >
          {hover.keys.length > 1 && <p className="px-2 pb-1 pt-1.5 text-xs text-muted">Which one is this? Picking links it.</p>}
          {hover.keys.map((key) => {
            const view = byKey.get(key);
            if (!view) return null;
            const count = appearancesFor?.(key) ?? 0;
            return (
              <button
                key={key}
                onClick={() => (hover.keys.length > 1 && editable ? linkSpan(hover.span, key) : (onOpenEntity?.(key), setHover(null)))}
                className="flex w-full gap-3 rounded-lg p-2 text-left hover:bg-surface-2"
              >
                <Portrait entity={view} src={portraitFor(key)} size={72} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{view.name}</span>
                    <TypeChip type={view.type}>{view.label || undefined}</TypeChip>
                  </span>
                  {view.aliases.length > 0 && <span className="block truncate text-xs text-muted">aka {view.aliases.join(", ")}</span>}
                  {view.summary && <span className="mt-0.5 line-clamp-3 block text-[13px]">{view.summary}</span>}
                  <span className="mt-1 block text-xs text-muted">
                    Appears in {count} chapter{count === 1 ? "" : "s"}
                    {hover.keys.length === 1 && (editable ? " · Ctrl+click to open" : " · click to open")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
