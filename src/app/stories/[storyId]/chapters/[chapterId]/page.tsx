"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Check, History as HistoryIcon, Loader2, MessageSquare, Sparkles, Users } from "lucide-react";
import { ChatThread } from "@/components/ChatThread";
import { SuggestionCard, type Suggestion } from "@/components/SuggestionCard";
import { ResizeHandle } from "@/components/ResizeHandle";
import { ProseHistory } from "@/components/ProseHistory";
import { ProseEditor } from "@/components/ProseEditor";
import { ChapterRail } from "@/components/ChapterRail";
import { SlideOver, type PanelTab } from "@/components/SlideOver";
import type { EntityTarget } from "@/components/EntityEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChapterHeader } from "@/components/ChapterHeader";
import { RESOURCE_PATH, portraitUrl, useBible } from "@/lib/bibleClient";
import { suggestionKey } from "@/lib/suggestions";
import { loadDismissedKeys, rememberDismissedKey, selectNewSuggestions } from "@/lib/pendingSuggestions";
import { createAutosave, type Autosave } from "@/lib/editor/autosave";
import { splitStreamError } from "@/lib/streamProtocol";
import { usePersistentState, useMediaQuery } from "@/lib/usePersistentState";

type PendingSuggestion = { id: number; suggestion: Suggestion };
type SaveState = "saved" | "unsaved" | "saving";

const COWRITER_MIN = 300;
const COWRITER_MAX = 600;
const clamp = (v: number) => Math.min(COWRITER_MAX, Math.max(COWRITER_MIN, v));

function suggestionBody(s: Suggestion) {
  const extras = {
    ...(s.aliases ? { aliases: s.aliases } : {}),
    ...(s.summary ? { summary: s.summary } : {}),
  };
  if (s.type === "timeline") return { title: s.name, description: s.description, ...extras };
  if (s.type === "character") return { name: s.name, appearance: s.appearance, personality: s.personality, ...(s.role ? { role: s.role } : {}), ...extras };
  if (s.type === "place") return { name: s.name, description: s.description, ...(s.kind ? { kind: s.kind } : {}), ...extras };
  return { name: s.name, description: s.description };
}

export default function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { storyId, chapterId } = use(params);
  const { focus } = use(searchParams);
  const router = useRouter();
  const bible = useBible(storyId);

  // ---------- layout preferences ----------
  const [coWriterOpen, setCoWriterOpen] = usePersistentState("story-maker.cowriter.open", true);
  const [coWriterWidth, setCoWriterWidth] = usePersistentState("story-maker.cowriter.width", 380);
  const [railOpen, setRailOpen] = usePersistentState("story-maker.rail.open", false);
  const [highlights, setHighlights] = usePersistentState("story-maker.highlights", true);
  const narrow = useMediaQuery("(max-width: 1099px)");
  const [narrowTab, setNarrowTab] = useState<"page" | "cowriter">("page");

  // ---------- chapter + prose ----------
  const [storyTitle, setStoryTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [prose, setProse] = useState("");
  const [contentKey, setContentKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [historyToken, setHistoryToken] = useState(0);
  const [focusKey, setFocusKey] = useState<string | null>(typeof focus === "string" ? focus : null);

  // ---------- slide-over ----------
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [target, setTarget] = useState<EntityTarget | null>(null);
  const openEntity = useCallback((key: string) => {
    setTarget({ key });
    setPanel("entity");
  }, []);

  const chapterUrl = `/api/stories/${storyId}/chapters/${chapterId}`;

  // ---------- autosave ----------
  const autosaveRef = useRef<Autosave | null>(null);
  useEffect(() => {
    const send = (content: string, versioning?: "draft") => {
      setSaveState("saving");
      return fetch(chapterUrl, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(versioning ? { generatedProse: content, versioning } : { generatedProse: content }),
        // Lets the final save on leaving the page finish after navigation.
        keepalive: true,
      })
        .then((r) => {
          setSaveState(r.ok ? "saved" : "unsaved");
          if (!versioning) setHistoryToken((t) => t + 1);
        })
        .catch(() => setSaveState("unsaved"));
    };
    const autosave = createAutosave({
      saveDraft: (c) => void send(c, "draft"),
      saveVersion: (c) => void send(c),
    });
    autosaveRef.current = autosave;
    const onLeave = () => autosave.flush();
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      autosave.flush();
      autosave.dispose();
    };
  }, [chapterUrl]);

  useEffect(() => {
    fetch(chapterUrl)
      .then((r) => r.json())
      .then((c) => {
        setChapterTitle(c.title ?? "");
        setProse(c.generatedProse ?? "");
        setContentKey((k) => k + 1);
        autosaveRef.current?.markVersioned(c.generatedProse ?? "");
        setSaveState("saved");
        setLoaded(true);
      });
    fetch(`/api/stories/${storyId}`)
      .then((r) => r.json())
      .then((s) => setStoryTitle(s.title ?? ""));
  }, [chapterUrl, storyId]);

  function onEdit(markdown: string) {
    setProse(markdown);
    setSaveState("unsaved");
    autosaveRef.current?.change(markdown);
  }

  // ---------- generation (streamed) ----------
  async function generateChapter() {
    autosaveRef.current?.saveNow();
    setIsGenerating(true);
    setGenerateError(null);
    let text = "";
    let lastPaint = 0;
    try {
      const res = await fetch(`${chapterUrl}/generate?stream=1`, { method: "POST" });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Generation failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        // Re-parsing the whole chapter on every token is wasteful; repaint a few times a second.
        if (Date.now() - lastPaint > 120) {
          lastPaint = Date.now();
          setProse(splitStreamError(text).text);
          setContentKey((k) => k + 1);
        }
      }
      const { text: final, error } = splitStreamError(text);
      setProse(final);
      setContentKey((k) => k + 1);
      if (error) throw new Error(error);
      autosaveRef.current?.markVersioned(final);
      setSaveState("saved");
      setHistoryToken((t) => t + 1);
      bible.refresh();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed — check your provider settings.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ---------- AI suggestions from the co-writer ----------
  const [pending, setPending] = useState<PendingSuggestion[]>([]);
  const nextId = useRef(0);
  const [suggestionNotice, setSuggestionNotice] = useState<string | null>(null);
  const dismissed = useRef<string[]>([]);
  useEffect(() => {
    dismissed.current = loadDismissedKeys(chapterId);
  }, [chapterId]);
  const existingKeys = useCallback(() => {
    const b = bible.bible;
    if (!b) return [];
    return [
      ...b.characters.map((c) => suggestionKey({ type: "character", name: c.name })),
      ...b.places.map((p) => suggestionKey({ type: "place", name: p.name })),
      ...b.themes.map((t) => suggestionKey({ type: "theme", name: t.name })),
      ...b.timeline.map((t) => suggestionKey({ type: "timeline", name: t.title })),
    ];
  }, [bible.bible]);
  // ChatThread reports suggestions from its own effects; a ref keeps the latest bible in view there.
  const existingRef = useRef(existingKeys);
  useEffect(() => {
    existingRef.current = existingKeys;
  }, [existingKeys]);

  async function acceptSuggestion(id: number, s: Suggestion) {
    const res = await fetch(`/api/stories/${storyId}/${RESOURCE_PATH[s.type]}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(suggestionBody(s)),
    });
    if (!res.ok) return setSuggestionNotice("Couldn't add that to the story bible — try again.");
    setPending((prev) => prev.filter((p) => p.id !== id));
    setSuggestionNotice(`Added "${s.name}" to the story bible`);
    setTimeout(() => setSuggestionNotice(null), 2500);
    bible.refresh();
  }

  function dismissSuggestion(id: number, s: Suggestion) {
    const key = suggestionKey(s);
    rememberDismissedKey(chapterId, key);
    dismissed.current = [...dismissed.current, key];
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  // Notes the bible already covers (accepted elsewhere, or loaded late) are not shown.
  const known = new Set(existingKeys());
  const visiblePending = pending.filter((p) => !known.has(suggestionKey(p.suggestion)));

  const portraitFor = useCallback((key: string) => portraitUrl(storyId, bible.bible, key), [storyId, bible.bible]);
  const appearancesFor = useCallback((key: string) => bible.bible?.appearances[key]?.length ?? 0, [bible.bible]);
  const chapters = bible.bible?.chapters ?? [];

  const coWriter = (
    <section className="flex h-full min-h-0 flex-col bg-surface p-4" aria-label="Co-writer">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">Co-writer</h2>
      <div className="min-h-0 flex-1">
        <ChatThread
          storyId={storyId}
          chapterId={chapterId}
          onSuggestion={(s) =>
            setPending((prev) => {
              const [fresh] = selectNewSuggestions([s], {
                existing: existingRef.current(),
                dismissed: dismissed.current,
                pending: prev.map((p) => suggestionKey(p.suggestion)),
              });
              return fresh ? [...prev, { id: nextId.current++, suggestion: fresh }] : prev;
            })
          }
        />
      </div>
      {(visiblePending.length > 0 || suggestionNotice) && (
        <div className="mt-3 max-h-[45%] space-y-2 overflow-y-auto border-t border-dashed border-line pt-3">
          {suggestionNotice && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <Check size={12} /> {suggestionNotice}
            </p>
          )}
          {visiblePending.map(({ id, suggestion }) => (
            <SuggestionCard key={id} suggestion={suggestion} onAccept={(edited) => acceptSuggestion(id, edited)} onDismiss={() => dismissSuggestion(id, suggestion)} />
          ))}
        </div>
      )}
    </section>
  );

  const toggle = (on: boolean, label: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      title={`${on ? "Hide" : "Show"} ${label.toLowerCase()}`}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs ${on ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
    >
      {icon} {label}
    </button>
  );

  const page = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg" aria-label="Chapter text">
      {loaded && (
        <ProseEditor
          content={prose}
          contentKey={contentKey}
          editable={!isGenerating}
          highlights={highlights}
          onHighlightsChange={setHighlights}
          matcher={bible.matcher}
          views={bible.views}
          byKey={bible.byKey}
          portraitFor={portraitFor}
          appearancesFor={appearancesFor}
          focusKey={focusKey}
          placeholder="Nothing written yet. Talk it through with the co-writer, then generate — or just start typing."
          onChange={onEdit}
          onOpenEntity={openEntity}
          onCreateEntity={(name) => {
            setTarget({ create: "character", name });
            setPanel("entity");
          }}
          onSaveShortcut={() => autosaveRef.current?.saveNow()}
          header={
            <ChapterHeader
              storyId={storyId}
              chapterId={chapterId}
              title={chapterTitle}
              onRenamed={(t) => {
                setChapterTitle(t);
                bible.refresh();
              }}
            />
          }
          toolbarEnd={
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-muted" aria-live="polite">
                {isGenerating ? "Writing…" : saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved" : "Saved"}
              </span>
              <button
                onClick={generateChapter}
                disabled={isGenerating}
                className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {isGenerating ? "Generating…" : "Generate chapter"}
              </button>
              {!narrow && toggle(coWriterOpen, "Co-writer", <MessageSquare size={14} />, () => setCoWriterOpen(!coWriterOpen))}
              {toggle(railOpen, "Entities", <Users size={14} />, () => setRailOpen(!railOpen))}
            </div>
          }
        />
      )}
      {generateError && <p className="border-t border-line bg-surface px-4 py-2 text-sm text-danger">{generateError}</p>}
    </section>
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <Link href={`/stories/${storyId}`} className="flex items-center gap-1 text-sm text-muted hover:text-fg" title="Back to story">
          <ArrowLeft size={15} /> <span className="hidden max-w-48 truncate sm:inline">{storyTitle || "Story"}</span>
        </Link>
        <span className="text-muted">/</span>
        <select
          aria-label="Chapter"
          value={chapterId}
          onChange={(e) => router.push(`/stories/${storyId}/chapters/${e.target.value}`)}
          className="max-w-64 truncate rounded-md border border-line bg-surface px-2 py-1 text-sm font-medium"
        >
          {chapters.length === 0 && <option value={chapterId}>{chapterTitle}</option>}
          {chapters.map((c, i) => (
            <option key={c.id} value={c.id}>
              {i + 1}. {c.title}
            </option>
          ))}
        </select>
        {narrow && (
          <div className="ml-2 flex rounded-lg bg-surface-2 p-0.5 text-sm" role="tablist">
            {(["page", "cowriter"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={narrowTab === t} onClick={() => setNarrowTab(t)} className={`rounded-md px-2.5 py-0.5 ${narrowTab === t ? "bg-surface shadow-soft" : "text-muted"}`}>
                {t === "page" ? "Page" : "Co-writer"}
              </button>
            ))}
          </div>
        )}
        <span className="flex-1" />
        <button onClick={() => setPanel("bible")} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-fg">
          <BookOpen size={15} /> Bible
        </button>
        <button onClick={() => setPanel("history")} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-fg">
          <HistoryIcon size={15} /> History
        </button>
        <ThemeToggle />
      </header>

      <div className="flex min-h-0 flex-1">
        {narrow ? (
          narrowTab === "cowriter" ? (
            <div className="min-w-0 flex-1">{coWriter}</div>
          ) : (
            page
          )
        ) : (
          <>
            {coWriterOpen && (
              <>
                <div className="shrink-0 border-r border-line" style={{ width: clamp(coWriterWidth) }}>
                  {coWriter}
                </div>
                <ResizeHandle onResize={(dx) => setCoWriterWidth((w) => clamp(w + dx))} />
              </>
            )}
            {page}
          </>
        )}
        {railOpen && (
          <div className="w-60 shrink-0">
            <ChapterRail
              storyId={storyId}
              bible={bible}
              chapterId={Number(chapterId)}
              prose={prose}
              activeKey={target && "key" in target ? target.key : null}
              onOpen={openEntity}
              onFocus={setFocusKey}
            />
          </div>
        )}
      </div>

      <SlideOver
        storyId={storyId}
        bible={bible}
        tab={panel}
        target={target}
        onTab={setPanel}
        onTarget={setTarget}
        onClose={() => setPanel(null)}
        history={
          <div className="space-y-4">
            <ProseHistory
              storyId={storyId}
              chapterId={chapterId}
              refreshToken={historyToken}
              onReverted={(content) => {
                setProse(content);
                setContentKey((k) => k + 1);
                autosaveRef.current?.markVersioned(content);
                setSaveState("saved");
              }}
            />
          </div>
        }
      />
    </div>
  );
}
