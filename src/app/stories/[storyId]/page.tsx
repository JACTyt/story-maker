"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Clock,
  Download,
  Loader2,
  MapPin,
  Plus,
  Save,
  Settings as SettingsIcon,
  Sparkles,
  Users,
} from "lucide-react";

type Chapter = { id: number; title: string; orderIndex: number; status: string };
type Story = { id: number; title: string; premise: string };

const TABS = [
  { href: "characters", label: "Characters", icon: Users },
  { href: "places", label: "Places", icon: MapPin },
  { href: "themes", label: "Themes", icon: Sparkles },
  { href: "timeline", label: "Timeline", icon: Clock },
  { href: "settings", label: "Settings", icon: SettingsIcon },
];

export default function StoryDashboard({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [compiledProse, setCompiledProse] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stories/${storyId}`)
      .then((r) => r.json())
      .then((data) => {
        setStory(data);
        setCompiledProse(data.compiledProse ?? "");
      });
    fetch(`/api/stories/${storyId}/chapters`).then((r) => r.json()).then(setChapters);
  }, [storyId]);

  async function generateFullStory() {
    setIsCompiling(true);
    setCompileError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Compile failed");
      const body = await res.json();
      setCompiledProse(body.compiledProse);
    } catch {
      setCompileError("Couldn't compile the story — try again.");
    } finally {
      setIsCompiling(false);
    }
  }

  async function saveCompiledProse() {
    await fetch(`/api/stories/${storyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ compiledProse }),
    });
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
    }
  }

  if (!story) {
    return (
      <main className="p-8 font-mono text-sm text-ink-faint">Turning the page...</main>
    );
  }

  const orderedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-1 font-display text-4xl font-medium text-paper">{story.title}</h1>
      {story.premise && <p className="mb-6 max-w-xl text-paper/60">{story.premise}</p>}

      <nav className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-ink-line pb-4 font-mono text-xs uppercase tracking-widest">
        <Link
          href={`/stories/${storyId}/quick-start`}
          className="flex items-center gap-1.5 text-fountain hover:text-paper"
        >
          <Sparkles size={13} /> Quick start
        </Link>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={`/stories/${storyId}/${t.href}`}
            className="flex items-center gap-1.5 text-paper/60 hover:text-fountain"
          >
            <t.icon size={13} /> {t.label}
          </Link>
        ))}
      </nav>

      <section className="mb-12">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">
          Table of contents
        </h2>
        {orderedChapters.length > 0 && (
          <ol className="mb-5 divide-y divide-ink-line border-y border-ink-line">
            {orderedChapters.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/stories/${storyId}/chapters/${c.id}`}
                  className="group flex items-baseline gap-3 py-2.5 hover:text-fountain"
                >
                  <span className="font-display text-sm text-carbon">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-display text-lg text-paper group-hover:text-fountain">{c.title}</span>
                  <span className="flex-1 border-b border-dotted border-ink-line" />
                  <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">{c.status}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <form onSubmit={createChapter} className="flex gap-2">
          <input
            className="flex-1 rounded-sm border border-ink-line bg-ink-wash px-3 py-2 text-paper placeholder:text-ink-faint focus:border-fountain focus:outline-none"
            placeholder="Next chapter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-sm border border-ink-line px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper hover:border-fountain hover:text-fountain"
          >
            <Plus size={13} /> Add chapter
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">The manuscript</h2>
          <div className="flex gap-2">
            <button
              onClick={generateFullStory}
              disabled={isCompiling}
              className="flex items-center gap-1.5 rounded-sm bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim disabled:opacity-50"
            >
              {isCompiling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {isCompiling ? "Compiling..." : "Compile full story"}
            </button>
            <a
              href={`/api/stories/${storyId}/export`}
              className="flex items-center gap-1.5 rounded-sm border border-fountain-dim px-4 py-2 font-mono text-xs uppercase tracking-wide text-fountain hover:bg-fountain-wash"
            >
              <Download size={13} /> Export .md
            </a>
          </div>
        </div>
        {compileError && <p className="mb-2 font-mono text-xs text-carbon">{compileError}</p>}
        <div className="page-surface rounded-sm p-6">
          <textarea
            className="min-h-64 w-full resize-y bg-transparent font-manuscript text-base leading-relaxed focus:outline-none"
            value={compiledProse}
            onChange={(e) => setCompiledProse(e.target.value)}
            placeholder="Nothing compiled yet. Write a chapter or two, then compile the full story here."
          />
        </div>
        <button
          onClick={saveCompiledProse}
          className="mt-3 flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-paper/60 underline hover:text-fountain"
        >
          <Save size={12} /> Save edits
        </button>
      </section>
    </main>
  );
}
