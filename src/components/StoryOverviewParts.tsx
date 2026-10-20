"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, GripVertical, Trash2 } from "lucide-react";
import { ImageStrip } from "./ImageStrip";

type Story = { id: number; title: string; premise: string };
export type ChapterItem = { id: number; title: string; orderIndex: number; status: string };

/** Large cover, the cover gallery, and the title and premise edited in place. */
export function StoryHeader({ story, onChange }: { story: Story; onChange: (patch: Partial<Story>) => void }) {
  const [title, setTitle] = useState(story.title);
  const [premise, setPremise] = useState(story.premise);
  const [coverId, setCoverId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/stories/${story.id}`;

  const loadCover = useCallback(() => {
    fetch(`${base}/images?entityType=story&entityId=${story.id}`)
      .then((r) => r.json())
      .then((rows: { id: number; isPrimary?: boolean }[]) => setCoverId((rows.find((r) => r.isPrimary) ?? rows[0])?.id ?? null))
      .catch(() => setCoverId(null));
  }, [base, story.id]);

  useEffect(() => {
    loadCover();
  }, [loadCover]);

  async function save(patch: Partial<Story>) {
    if (patch.title !== undefined && !patch.title.trim()) {
      setTitle(story.title);
      return;
    }
    if ((patch.title ?? story.title) === story.title && (patch.premise ?? story.premise) === story.premise) return;
    const res = await fetch(base, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) return setError("Couldn't save — try again.");
    setError(null);
    onChange(patch);
  }

  return (
    <section className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="w-full shrink-0 sm:w-60">
        {coverId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${base}/images/${coverId}`} alt="Cover" className="mb-3 aspect-[3/4] w-full rounded-xl object-cover shadow-soft" />
        ) : (
          <div className="mb-3 flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-muted">
            <BookOpen size={28} />
            Add a cover below
          </div>
        )}
        <ImageStrip storyId={String(story.id)} entityType="story" entityId={story.id} size="sm" onChanged={loadCover} />
        <p className="mt-1 text-[11px] text-muted">★ marks the cover. Drop images here.</p>
      </div>
      <div className="min-w-0 flex-1">
        <input
          aria-label="Story title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save({ title: title.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-full rounded-md bg-transparent text-3xl font-semibold tracking-tight outline-none hover:bg-surface-2 focus:bg-surface-2"
        />
        <textarea
          aria-label="Premise"
          value={premise}
          placeholder="What is this story about?"
          onChange={(e) => setPremise(e.target.value)}
          onBlur={() => save({ premise })}
          rows={3}
          className="mt-1 w-full resize-y rounded-md bg-transparent text-muted outline-none placeholder:text-muted hover:bg-surface-2 focus:bg-surface-2"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </section>
  );
}

/** Chapters in reading order: drag the handle to reorder, delete with confirmation. */
export function ChapterList({
  storyId,
  chapters,
  castFor,
  onChange,
}: {
  storyId: string;
  chapters: ChapterItem[];
  castFor: (chapterId: number) => string[];
  onChange: (chapters: ChapterItem[]) => void;
}) {
  const ordered = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);
  const dragId = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(fromId: number, toId: number) {
    if (fromId === toId) return;
    const ids = ordered.map((c) => c.id);
    ids.splice(ids.indexOf(fromId), 1);
    ids.splice(ids.indexOf(toId), 0, fromId);
    onChange(ids.map((id, orderIndex) => ({ ...ordered.find((c) => c.id === id)!, orderIndex })));
    const res = await fetch(`/api/stories/${storyId}/chapters/reorder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setError(res.ok ? null : "Couldn't save the new order.");
  }

  async function remove(id: number) {
    const res = await fetch(`/api/stories/${storyId}/chapters/${id}`, { method: "DELETE" });
    if (!res.ok) return setError("Couldn't delete that chapter.");
    setConfirming(null);
    onChange(chapters.filter((c) => c.id !== id));
  }

  if (ordered.length === 0) return null;

  return (
    <>
      <ol className="mb-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {ordered.map((c, i) => (
          <li
            key={c.id}
            onDragOver={(e) => {
              if (dragId.current === null) return;
              e.preventDefault();
              setOver(c.id);
            }}
            onDragLeave={() => setOver((prev) => (prev === c.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId.current !== null) move(dragId.current, c.id);
              dragId.current = null;
              setOver(null);
            }}
            className={over === c.id ? "bg-surface-2" : undefined}
          >
            {confirming === c.id ? (
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm" role="alertdialog" aria-label="Confirm delete">
                <span className="flex-1">
                  Delete <b>{c.title}</b> with its chat, drafts and images?
                </span>
                <button onClick={() => remove(c.id)} className="rounded-md bg-danger px-3 py-1 font-semibold text-white">
                  Delete
                </button>
                <button onClick={() => setConfirming(null)} className="rounded-md border border-line px-3 py-1">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="group flex items-center">
                <span
                  draggable
                  onDragStart={() => (dragId.current = c.id)}
                  onDragEnd={() => {
                    dragId.current = null;
                    setOver(null);
                  }}
                  title="Drag to reorder"
                  aria-label={`Reorder ${c.title}`}
                  className="cursor-grab px-2 py-3 text-muted opacity-40 hover:opacity-100 active:cursor-grabbing"
                >
                  <GripVertical size={16} />
                </span>
                <Link href={`/stories/${storyId}/chapters/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 hover:text-accent">
                  <span className="w-6 text-sm tabular-nums text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                  <span className="hidden truncate text-xs text-muted sm:block">{castFor(c.id).join(", ")}</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{c.status}</span>
                </Link>
                <button
                  onClick={() => setConfirming(c.id)}
                  aria-label={`Delete ${c.title}`}
                  title="Delete chapter"
                  className="mr-2 rounded-md p-1.5 text-muted opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
    </>
  );
}
