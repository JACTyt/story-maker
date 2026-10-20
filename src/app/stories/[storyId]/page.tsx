"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { BookOpen, Download, Loader2, Pencil, Plus, Save, Settings as SettingsIcon, Sparkles, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ChapterList, StoryHeader } from "@/components/StoryOverviewParts";
import { ProseEditor } from "@/components/ProseEditor";
import { SlideOver, type PanelTab } from "@/components/SlideOver";
import type { EntityTarget } from "@/components/EntityEditor";
import { portraitUrl, useBible } from "@/lib/bibleClient";
import { usePersistentState } from "@/lib/usePersistentState";

type Chapter = { id: number; title: string; orderIndex: number; status: string };
type Story = { id: number; title: string; premise: string };

export default function StoryOverview({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  const bible = useBible(storyId);
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [compiled, setCompiled] = useState("");
  const [compiledKey, setCompiledKey] = useState(0);
  const [editingCompiled, setEditingCompiled] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [highlights, setHighlights] = usePersistentState("story-maker.highlights", true);
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [target, setTarget] = useState<EntityTarget | null>(null);

  useEffect(() => {
    fetch(`/api/stories/${storyId}`)
      .then((r) => r.json())
      .then((data) => {
        setStory(data);
        setCompiled(data.compiledProse ?? "");
        setCompiledKey((k) => k + 1);
      });
    fetch(`/api/stories/${storyId}/chapters`).then((r) => r.json()).then(setChapters);
  }, [storyId]);

  async function compile() {
    setIsCompiling(true);
    setCompileError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/generate`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Compile failed");
      setCompiled(body.compiledProse);
      setCompiledKey((k) => k + 1);
      bible.refresh();
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : "Couldn't compile the story — try again.");
    } finally {
      setIsCompiling(false);
    }
  }

  async function saveCompiled() {
    await fetch(`/api/stories/${storyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ compiledProse: compiled }),
    });
    setEditingCompiled(false);
  }

  async function createChapter(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/stories/${storyId}/chapters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, orderIndex: chapters.length }),
    });
    if (res.ok) {
      const created = await res.json();
      setChapters((prev) => [...prev, created]);
      setTitle("");
      bible.refresh();
    }
  }

  const portraitFor = useCallback((key: string) => portraitUrl(storyId, bible.bible, key), [storyId, bible.bible]);
  const openEntity = useCallback((key: string) => {
    setTarget({ key });
    setPanel("entity");
  }, []);

  if (!story) {
    return (
      <>
        <AppHeader />
        <main className="p-8 text-sm text-muted">Loading…</main>
      </>
    );
  }

  const navLink = "flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent";

  return (
    <>
      <AppHeader>
        <span className="text-muted">/</span>
        <span className="truncate text-sm font-medium">{story.title}</span>
      </AppHeader>
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <StoryHeader story={story} onChange={(patch) => setStory((prev) => (prev ? { ...prev, ...patch } : prev))} />
        <nav className="-mt-4 mb-10 flex flex-wrap gap-2">
          <Link href={`/stories/${storyId}/bible`} className={navLink}>
            <BookOpen size={14} /> Story bible
          </Link>
          <Link href={`/stories/${storyId}/quick-start`} className={navLink}>
            <Wand2 size={14} /> Quick start
          </Link>
          <Link href={`/stories/${storyId}/settings`} className={navLink}>
            <SettingsIcon size={14} /> Settings
          </Link>
        </nav>

        <section className="mb-12">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">Chapters</h2>
          <ChapterList
            storyId={storyId}
            chapters={chapters}
            castFor={(chapterId) =>
              Object.entries(bible.bible?.appearances ?? {})
                .filter(([key, list]) => key.startsWith("character:") && list.some((a) => a.chapterId === chapterId))
                .map(([key]) => bible.byKey.get(key)?.name ?? "")
                .filter(Boolean)
                .slice(0, 5)
            }
            onChange={(next) => {
              setChapters(next);
              bible.refresh();
            }}
          />
          <form onSubmit={createChapter} className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
              placeholder="Next chapter title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <button type="submit" className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm hover:border-accent">
              <Plus size={14} /> Add chapter
            </button>
          </form>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted">The manuscript</h2>
            <span className="flex-1" />
            {editingCompiled ? (
              <button onClick={saveCompiled} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm">
                <Save size={14} /> Save edits
              </button>
            ) : (
              compiled && (
                <button onClick={() => setEditingCompiled(true)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg">
                  <Pencil size={14} /> Edit
                </button>
              )
            )}
            <button onClick={compile} disabled={isCompiling} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg disabled:opacity-50">
              {isCompiling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isCompiling ? "Compiling…" : "Compile full story"}
            </button>
            <a href={`/api/stories/${storyId}/export`} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent">
              <Download size={14} /> Export .md
            </a>
          </div>
          {compileError && <p className="mb-2 text-sm text-danger">{compileError}</p>}
          <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-line bg-surface">
            {compiled || editingCompiled ? (
              <ProseEditor
                content={compiled}
                contentKey={compiledKey}
                editable={editingCompiled}
                headings
                showToolbar={editingCompiled}
                highlights={highlights}
                onHighlightsChange={setHighlights}
                matcher={bible.matcher}
                views={bible.views}
                byKey={bible.byKey}
                portraitFor={portraitFor}
                appearancesFor={(key) => bible.bible?.appearances[key]?.length ?? 0}
                onChange={setCompiled}
                onOpenEntity={openEntity}
              />
            ) : (
              <p className="p-8 text-muted">Nothing compiled yet. Write a chapter or two, then compile the full story here.</p>
            )}
          </div>
        </section>
      </main>
      <SlideOver storyId={storyId} bible={bible} tab={panel} target={target} onTab={setPanel} onTarget={setTarget} onClose={() => setPanel(null)} />
    </>
  );
}
