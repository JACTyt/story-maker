"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, History, Loader2, Pencil, Save, Sparkles } from "lucide-react";
import { ChatThread } from "@/components/ChatThread";
import { SuggestionCard, type Suggestion } from "@/components/SuggestionCard";
import { ReferenceSidebar } from "@/components/ReferenceSidebar";
import { ResizeHandle } from "@/components/ResizeHandle";
import { ProseHistory } from "@/components/ProseHistory";
import { parseRichText, type RichSegment } from "@/lib/richText";
import { suggestionKey } from "@/lib/suggestions";
import { loadDismissedKeys, rememberDismissedKey, selectNewSuggestions } from "@/lib/pendingSuggestions";

const RESOURCE_PATH: Record<Suggestion["type"], string> = {
  character: "characters",
  place: "places",
  theme: "themes",
  timeline: "timeline",
};

// Timeline events title their entries differently from every other entity.
const BIBLE_SOURCES: { path: string; type: Suggestion["type"]; nameField: "name" | "title" }[] = [
  { path: "characters", type: "character", nameField: "name" },
  { path: "places", type: "place", nameField: "name" },
  { path: "themes", type: "theme", nameField: "name" },
  { path: "timeline", type: "timeline", nameField: "title" },
];

type PendingSuggestion = { id: number; suggestion: Suggestion };
type Place = { id: number; name: string; description: string };

const PANEL_STORAGE_KEY = "story-maker.chapterPanelWidths";
const SIDEBAR_DEFAULT = 260;
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const COWRITING_DEFAULT = 480;
const COWRITING_MIN = 320;
const COWRITING_MAX = 800;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function renderSegment(seg: RichSegment): React.ReactNode {
  let node: React.ReactNode = seg.text;
  if (seg.bold) node = <strong>{node}</strong>;
  if (seg.italic) node = <em>{node}</em>;
  if (seg.placeDescription) {
    node = (
      <span title={seg.placeDescription} className="cursor-help underline decoration-dotted decoration-fountain/60">
        {node}
      </span>
    );
  }
  return node;
}

function ProsePreview({ text, places }: { text: string; places: Place[] }) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return (
      <p className="text-ink-faint">Nothing generated yet. Talk it through on the left, then generate this chapter.</p>
    );
  }
  return (
    <div className="space-y-4">
      {lines.map((line, i) => (
        <p key={i}>
          {parseRichText(line, places).map((seg, j) => (
            <span key={j}>{renderSegment(seg)}</span>
          ))}
        </p>
      ))}
    </div>
  );
}

export default function ChapterViewPage({
  params,
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  const { storyId, chapterId } = use(params);
  const [chapterTitle, setChapterTitle] = useState("");
  const [prose, setProse] = useState("");
  const [status, setStatus] = useState("drafting");
  const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[]>([]);
  const nextSuggestionId = useRef(0);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [bibleRefreshToken, setBibleRefreshToken] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview" | "history">("edit");
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [places, setPlaces] = useState<Place[]>([]);
  // Held as refs, not state: the suggestion handler fires from a child effect,
  // where state captured at render time would already be stale.
  const existingKeys = useRef<string[]>([]);
  const dismissedKeys = useRef<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [coWritingWidth, setCoWritingWidth] = useState(COWRITING_DEFAULT);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PANEL_STORAGE_KEY) ?? "null");
      if (typeof saved?.sidebar === "number") setSidebarWidth(clamp(saved.sidebar, SIDEBAR_MIN, SIDEBAR_MAX));
      if (typeof saved?.coWriting === "number") setCoWritingWidth(clamp(saved.coWriting, COWRITING_MIN, COWRITING_MAX));
    } catch {
      // ignore malformed or unavailable localStorage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify({ sidebar: sidebarWidth, coWriting: coWritingWidth }));
  }, [sidebarWidth, coWritingWidth]);

  const resizeSidebar = useCallback((delta: number) => {
    setSidebarWidth((w) => clamp(w + delta, SIDEBAR_MIN, SIDEBAR_MAX));
  }, []);

  const resizeCoWriting = useCallback((delta: number) => {
    setCoWritingWidth((w) => clamp(w + delta, COWRITING_MIN, COWRITING_MAX));
  }, []);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/chapters/${chapterId}`)
      .then((r) => r.json())
      .then((c) => {
        setChapterTitle(c.title ?? "");
        setProse(c.generatedProse ?? "");
        setStatus(c.status);
      });
  }, [storyId, chapterId]);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/places`)
      .then((r) => r.json())
      .then(setPlaces);
  }, [storyId, bibleRefreshToken]);

  useEffect(() => {
    dismissedKeys.current = loadDismissedKeys(chapterId);
  }, [chapterId]);

  // Chat history is re-parsed on every mount, so the bible is what tells us
  // which of those suggestions the writer already acted on.
  useEffect(() => {
    Promise.all(
      BIBLE_SOURCES.map((source) =>
        fetch(`/api/stories/${storyId}/${source.path}`)
          .then((r) => r.json())
          .catch(() => [])
      )
    ).then((results) => {
      existingKeys.current = results.flatMap((rows, i) => {
        const { type, nameField } = BIBLE_SOURCES[i];
        return (Array.isArray(rows) ? rows : []).map((row) =>
          suggestionKey({ type, name: String(row?.[nameField] ?? "") })
        );
      });
    });
  }, [storyId, bibleRefreshToken]);

  function dismissSuggestion(id: number, s: Suggestion) {
    const key = suggestionKey(s);
    rememberDismissedKey(chapterId, key);
    dismissedKeys.current = [...dismissedKeys.current, key];
    setPendingSuggestions((prev) => prev.filter((p) => p.id !== id));
  }

  async function acceptSuggestion(id: number, s: Suggestion) {
    setSuggestionError(null);
    const path = RESOURCE_PATH[s.type];
    const body =
      s.type === "timeline"
        ? { title: s.name, description: s.description }
        : s.type === "character"
          ? { name: s.name, appearance: s.appearance, personality: s.personality }
          : { name: s.name, description: s.description };
    try {
      const res = await fetch(`/api/stories/${storyId}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      existingKeys.current = [...existingKeys.current, suggestionKey(s)];
      setPendingSuggestions((prev) => prev.filter((p) => p.id !== id));
      setBibleRefreshToken((prev) => prev + 1);
      setAddedNotice(`Added "${s.name}" to the story bible`);
      setTimeout(() => setAddedNotice((prev) => (prev === `Added "${s.name}" to the story bible` ? null : prev)), 2500);
    } catch {
      setSuggestionError("Couldn't add that to the story bible — try again.");
    }
  }

  async function generateChapter() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/generate`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Generation failed");
      setProse(body.generatedProse);
      setStatus(body.status);
      setHistoryRefreshToken((prev) => prev + 1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed — check your provider settings and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveProse() {
    await fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ generatedProse: prose }),
    });
    // The edit is stored as its own version, so the history has a new entry.
    setHistoryRefreshToken((prev) => prev + 1);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
        <Link
          href={`/stories/${storyId}`}
          className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-paper/50 hover:text-fountain"
        >
          <ArrowLeft size={12} /> Back to story
        </Link>
        {chapterTitle && <span className="font-display text-sm text-paper/70">{chapterTitle}</span>}
      </div>

      <main className="flex flex-1 flex-col bg-ink-line lg:flex-row">
        <div
          className="shrink-0 border-b border-ink-line lg:w-[var(--panel-w)] lg:border-b-0"
          style={{ "--panel-w": `${sidebarWidth}px` } as React.CSSProperties}
        >
          <ReferenceSidebar storyId={storyId} refreshToken={bibleRefreshToken} />
        </div>
        <ResizeHandle onResize={resizeSidebar} />

        <section
          className="flex min-h-[50vh] shrink-0 flex-col border-b border-ink-line bg-ink p-5 lg:h-full lg:w-[var(--panel-w)] lg:border-b-0"
          style={{ "--panel-w": `${coWritingWidth}px` } as React.CSSProperties}
        >
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">Co-writing</h2>
          <div className="min-h-0 flex-1">
            <ChatThread
              storyId={storyId}
              chapterId={chapterId}
              onSuggestion={(s) =>
                setPendingSuggestions((prev) => {
                  const [fresh] = selectNewSuggestions([s], {
                    existing: existingKeys.current,
                    dismissed: dismissedKeys.current,
                    pending: prev.map((p) => suggestionKey(p.suggestion)),
                  });
                  return fresh ? [...prev, { id: nextSuggestionId.current++, suggestion: fresh }] : prev;
                })
              }
            />
          </div>
          {(pendingSuggestions.length > 0 || addedNotice) && (
            <div className="mt-4 space-y-3 border-t border-dashed border-ink-line pt-4">
              {suggestionError && <p className="font-mono text-xs text-carbon">{suggestionError}</p>}
              {addedNotice && (
                <p className="flex items-center gap-1 font-mono text-xs text-fountain">
                  <Check size={12} /> {addedNotice}
                </p>
              )}
              {pendingSuggestions.map(({ id, suggestion }) => (
                <SuggestionCard
                  key={id}
                  suggestion={suggestion}
                  onAccept={(edited) => acceptSuggestion(id, edited)}
                  onDismiss={() => dismissSuggestion(id, suggestion)}
                />
              ))}
            </div>
          )}
        </section>
        <ResizeHandle onResize={resizeCoWriting} />

        <section className="flex min-h-[50vh] min-w-0 flex-1 flex-col bg-ink p-5 lg:h-full">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">
              The page &middot; <span className="text-carbon">{status}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-sm border border-ink-line p-0.5">
                <button
                  onClick={() => setMode("edit")}
                  className={`flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-xs uppercase tracking-wide ${
                    mode === "edit" ? "bg-paper text-ink" : "text-paper/50 hover:text-paper/80"
                  }`}
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => setMode("preview")}
                  className={`flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-xs uppercase tracking-wide ${
                    mode === "preview" ? "bg-paper text-ink" : "text-paper/50 hover:text-paper/80"
                  }`}
                >
                  <Eye size={12} /> Preview
                </button>
                <button
                  onClick={() => setMode("history")}
                  className={`flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-xs uppercase tracking-wide ${
                    mode === "history" ? "bg-paper text-ink" : "text-paper/50 hover:text-paper/80"
                  }`}
                >
                  <History size={12} /> History
                </button>
              </div>
              <button
                onClick={generateChapter}
                disabled={isGenerating}
                className="flex items-center gap-1.5 rounded-sm bg-paper px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {isGenerating ? "Generating..." : "Generate chapter"}
              </button>
            </div>
          </div>
          {generateError && <p className="mb-2 font-mono text-xs text-carbon">{generateError}</p>}
          <div className="page-surface flex-1 overflow-y-auto rounded-sm p-6">
            {mode === "edit" && (
              <textarea
                className="h-full w-full resize-none bg-transparent font-manuscript text-base leading-relaxed focus:outline-none"
                value={prose}
                onChange={(e) => setProse(e.target.value)}
                placeholder="Nothing generated yet. Talk it through on the left, then generate this chapter."
              />
            )}
            {mode === "preview" && (
              <div className="font-manuscript text-base leading-relaxed">
                <ProsePreview text={prose} places={places} />
              </div>
            )}
            {mode === "history" && (
              <ProseHistory
                storyId={storyId}
                chapterId={chapterId}
                refreshToken={historyRefreshToken}
                onReverted={(content) => {
                  setProse(content);
                  setStatus("generated");
                }}
              />
            )}
          </div>
          {mode === "edit" && (
            <button
              onClick={saveProse}
              className="mt-3 flex items-center gap-1 self-start font-mono text-xs uppercase tracking-wide text-paper/60 underline hover:text-fountain"
            >
              <Save size={12} /> Save edits
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
