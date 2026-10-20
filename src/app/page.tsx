"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { StoryCard } from "@/components/StoryCard";
import { AppHeader } from "@/components/AppHeader";

type Story = { id: number; title: string; premise: string };

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [covers, setCovers] = useState<Record<number, number>>({});
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");

  useEffect(() => {
    fetch("/api/stories")
      .then((r) => r.json())
      .then((rows: Story[]) => {
        setStories(rows);
        rows.forEach((s) => loadCover(s.id));
      });
  }, []);

  function loadCover(storyId: number) {
    fetch(`/api/stories/${storyId}/images?entityType=story&entityId=${storyId}`)
      .then((r) => r.json())
      .then((imgs: { id: number; isPrimary?: boolean }[]) => {
        const cover = imgs.find((i) => i.isPrimary) ?? imgs[0];
        if (cover) setCovers((prev) => ({ ...prev, [storyId]: cover.id }));
      })
      .catch(() => {});
  }

  async function createStory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, premise }),
    });
    if (res.ok) {
      const created = await res.json();
      setStories((prev) => [created, ...prev]);
      setTitle("");
      setPremise("");
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <section className="mb-14 grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Begin a new story.</h1>
            <p className="mt-2 text-muted">Talk it through with a co-writer, chapter by chapter. Everything stays on this computer.</p>
          </div>
          <form onSubmit={createStory} className="space-y-3 rounded-xl border border-line bg-surface p-4 shadow-soft">
            <input
              className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted"
              placeholder="Working title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="min-h-16 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
              placeholder="One or two sentences — what is this story about?"
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
            />
            <button type="submit" className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg">
              <Plus size={15} /> Create story
            </button>
          </form>
        </section>

        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted">Your stories</h2>
        {stories.length === 0 ? (
          <p className="text-muted">No stories yet — the form above is where the first one starts.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <li key={s.id}>
                <StoryCard
                  story={s}
                  coverId={covers[s.id] ?? null}
                  onCoverChanged={(imageId) => setCovers((prev) => ({ ...prev, [s.id]: imageId }))}
                  onDuplicated={(copy) => {
                    setStories((prev) => [copy, ...prev]);
                    loadCover(copy.id);
                  }}
                  onDeleted={(id) => setStories((prev) => prev.filter((x) => x.id !== id))}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
