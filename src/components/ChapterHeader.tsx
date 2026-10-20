"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";

type ImageRow = { id: number; isPrimary?: boolean };

/** Full-width banner image (optional) plus the chapter title, renamed in place. */
export function ChapterHeader({
  storyId,
  chapterId,
  title,
  onRenamed,
}: {
  storyId: string;
  chapterId: string;
  title: string;
  onRenamed?: (title: string) => void;
}) {
  const [image, setImage] = useState<ImageRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const inputId = useId();
  const base = `/api/stories/${storyId}/images`;

  const [syncedTitle, setSyncedTitle] = useState(title);
  if (syncedTitle !== title) {
    setSyncedTitle(title);
    setDraftTitle(title);
  }

  const load = useCallback(() => {
    fetch(`${base}?entityType=chapter&entityId=${chapterId}`)
      .then((r) => r.json())
      .then((rows: ImageRow[]) => setImage(Array.isArray(rows) ? (rows.find((r) => r.isPrimary) ?? rows[0] ?? null) : null))
      .catch(() => setImage(null));
  }, [base, chapterId]);

  useEffect(() => {
    load();
  }, [load]);

  async function replace(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", "chapter");
      form.append("entityId", chapterId);
      const res = await fetch(base, { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Upload failed");
      // The header shows one image: the new upload becomes it, the old one goes.
      await fetch(`${base}/${body.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isPrimary: true }) });
      if (image && image.id !== body.id) await fetch(`${base}/${image.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!image) return;
    await fetch(`${base}/${image.id}`, { method: "DELETE" });
    load();
  }

  async function rename() {
    const next = draftTitle.trim();
    if (!next || next === title) return setDraftTitle(title);
    const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    if (res.ok) onRenamed?.(next);
  }

  const picker = (
    <input
      id={inputId}
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) replace(file);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="group/header mb-6">
      {image ? (
        <div className="relative mb-6 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${base}/${image.id}`} alt="" className="h-48 w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/header:opacity-100 focus-within:opacity-100">
            <label htmlFor={inputId} className="flex cursor-pointer items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs text-white hover:bg-black/70">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />} Change
            </label>
            <button onClick={remove} aria-label="Remove header image" className="rounded-md bg-black/55 px-2 py-1 text-white hover:bg-black/70">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="mb-2 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-sans text-xs text-muted opacity-0 transition-opacity hover:bg-surface-2 hover:text-fg group-hover/header:opacity-100 focus-within:opacity-100"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />} Add header image
        </label>
      )}
      {picker}
      <input
        aria-label="Chapter title"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onBlur={rename}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-full bg-transparent font-sans text-3xl font-semibold tracking-tight outline-none"
      />
      {error && <p className="mt-1 font-sans text-xs text-danger">{error}</p>}
    </div>
  );
}
