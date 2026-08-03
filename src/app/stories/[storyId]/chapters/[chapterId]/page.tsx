"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";
import { ChatThread } from "@/components/ChatThread";
import { SuggestionCard, type Suggestion } from "@/components/SuggestionCard";
import { ReferenceSidebar } from "@/components/ReferenceSidebar";

const RESOURCE_PATH: Record<Suggestion["type"], string> = {
  character: "characters",
  scene: "scenes",
  theme: "themes",
  timeline: "timeline",
};

export default function ChapterViewPage({
  params,
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  const { storyId, chapterId } = use(params);
  const [chapterTitle, setChapterTitle] = useState("");
  const [prose, setProse] = useState("");
  const [status, setStatus] = useState("drafting");
  const [pendingSuggestions, setPendingSuggestions] = useState<Suggestion[]>([]);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [bibleRefreshToken, setBibleRefreshToken] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/chapters/${chapterId}`)
      .then((r) => r.json())
      .then((c) => {
        setChapterTitle(c.title ?? "");
        setProse(c.generatedProse ?? "");
        setStatus(c.status);
      });
  }, [storyId, chapterId]);

  async function acceptSuggestion(s: Suggestion) {
    setSuggestionError(null);
    const path = RESOURCE_PATH[s.type];
    const body = s.type === "character" || s.type === "theme"
      ? { name: s.name, description: s.description }
      : { title: s.name, description: s.description };
    try {
      const res = await fetch(`/api/stories/${storyId}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      setPendingSuggestions((prev) => prev.filter((p) => p !== s));
      setBibleRefreshToken((prev) => prev + 1);
    } catch {
      setSuggestionError("Couldn't add that to the story bible — try again.");
    }
  }

  async function generateChapter() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      const body = await res.json();
      setProse(body.generatedProse);
      setStatus(body.status);
    } catch {
      setGenerateError("Generation failed — check your provider settings and try again.");
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

      <main className="grid flex-1 grid-cols-1 gap-px bg-ink-line lg:grid-cols-[260px_1fr_1fr]">
        <ReferenceSidebar storyId={storyId} refreshToken={bibleRefreshToken} />

        <section className="flex min-h-[50vh] flex-col bg-ink p-5 lg:h-full">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">Co-writing</h2>
          <div className="min-h-0 flex-1">
            <ChatThread
              storyId={storyId}
              chapterId={chapterId}
              onSuggestion={(s) => setPendingSuggestions((prev) => [...prev, s])}
            />
          </div>
          {pendingSuggestions.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-dashed border-ink-line pt-4">
              {suggestionError && <p className="font-mono text-xs text-carbon">{suggestionError}</p>}
              {pendingSuggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  onAccept={acceptSuggestion}
                  onDismiss={() => setPendingSuggestions((prev) => prev.filter((p) => p !== s))}
                />
              ))}
            </div>
          )}
        </section>

        <section className="flex min-h-[50vh] flex-col bg-ink p-5 lg:h-full">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">
              The page &middot; <span className="text-carbon">{status}</span>
            </h2>
            <button
              onClick={generateChapter}
              disabled={isGenerating}
              className="flex items-center gap-1.5 rounded-sm bg-paper px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {isGenerating ? "Generating..." : "Generate chapter"}
            </button>
          </div>
          {generateError && <p className="mb-2 font-mono text-xs text-carbon">{generateError}</p>}
          <div className="page-surface flex-1 overflow-y-auto rounded-sm p-6">
            <textarea
              className="h-full w-full resize-none bg-transparent font-manuscript text-base leading-relaxed focus:outline-none"
              value={prose}
              onChange={(e) => setProse(e.target.value)}
              placeholder="Nothing generated yet. Talk it through on the left, then generate this chapter."
            />
          </div>
          <button
            onClick={saveProse}
            className="mt-3 flex items-center gap-1 self-start font-mono text-xs uppercase tracking-wide text-paper/60 underline hover:text-fountain"
          >
            <Save size={12} /> Save edits
          </button>
        </section>
      </main>
    </div>
  );
}
