"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { BookOpen, Camera, Copy, Loader2, Trash2 } from "lucide-react";

export type StoryCardData = { id: number; title: string; premise: string };

/** A story on the shelf: open it, change its cover, copy it, or delete it (with confirmation). */
export function StoryCard({
  story,
  coverId,
  onCoverChanged,
  onDuplicated,
  onDeleted,
}: {
  story: StoryCardData;
  coverId: number | null;
  onCoverChanged: (imageId: number) => void;
  onDuplicated: (copy: StoryCardData) => void;
  onDeleted: (id: number) => void;
}) {
  const [busy, setBusy] = useState<null | "cover" | "copy" | "delete">(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const base = `/api/stories/${story.id}`;

  async function uploadCover(file: File) {
    setBusy("cover");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", "story");
      form.append("entityId", String(story.id));
      const res = await fetch(`${base}/images`, { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Upload failed");
      await fetch(`${base}/images/${body.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isPrimary: true }) });
      onCoverChanged(body.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    setBusy("copy");
    setError(null);
    try {
      const res = await fetch(`${base}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      onDuplicated(await res.json());
    } catch {
      setError("Couldn't copy this story.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(base, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(story.id);
    } catch {
      setError("Couldn't delete this story.");
      setBusy(null);
    }
  }

  const action = "rounded-md bg-black/55 p-1.5 text-white hover:bg-black/75 disabled:opacity-50";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-surface shadow-soft transition-colors hover:border-accent">
      <Link href={`/stories/${story.id}`} className="block">
        {coverId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${base}/images/${coverId}`} alt="" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-surface-2 text-muted">
            <BookOpen size={28} />
          </div>
        )}
        <div className="p-4">
          <span className="block text-lg font-semibold group-hover:text-accent">{story.title}</span>
          {story.premise && <span className="mt-1 line-clamp-2 block text-sm text-muted">{story.premise}</span>}
        </div>
      </Link>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <label htmlFor={inputId} title={coverId ? "Change cover" : "Add cover"} className={`${action} cursor-pointer`}>
          {busy === "cover" ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          <span className="sr-only">{coverId ? "Change cover" : "Add cover"}</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadCover(file);
            e.target.value = "";
          }}
        />
        <button onClick={duplicate} disabled={busy !== null} title="Make a copy" aria-label="Make a copy" className={action}>
          {busy === "copy" ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
        </button>
        <button onClick={() => setConfirming(true)} disabled={busy !== null} title="Delete story" aria-label="Delete story" className={action}>
          <Trash2 size={14} />
        </button>
      </div>

      {confirming && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/95 p-5 text-center" role="alertdialog" aria-label="Confirm delete">
          <p className="text-sm">
            Delete <b>{story.title}</b>? All chapters, drafts, the story bible and images will be removed. This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={remove} disabled={busy === "delete"} className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
              {busy === "delete" && <Loader2 size={13} className="animate-spin" />} Delete
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-md border border-line px-3 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="px-4 pb-3 text-xs text-danger">{error}</p>}
    </div>
  );
}
