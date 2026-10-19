"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

export type ImageEntityType = "character" | "place" | "chapter" | "story";

type ImageRow = { id: number; caption: string; mimeType: string; storedName: string };

export function ImageStrip({
  storyId,
  entityType,
  entityId,
  readOnly = false,
  size = "md",
}: {
  storyId: string;
  entityType: ImageEntityType;
  entityId: number;
  readOnly?: boolean;
  size?: "sm" | "md";
}) {
  const [items, setItems] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const listUrl = `/api/stories/${storyId}/images?entityType=${entityType}&entityId=${entityId}`;

  const load = useCallback(() => {
    fetch(listUrl)
      .then((r) => r.json())
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setError("Couldn't load images."));
  }, [listUrl]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(files: FileList | File[]) {
    const chosen = Array.from(files);
    if (chosen.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of chosen) {
        const form = new FormData();
        form.append("file", file);
        form.append("entityType", entityType);
        form.append("entityId", String(entityId));
        const res = await fetch(`/api/stories/${storyId}/images`, { method: "POST", body: form });
        if (!res.ok) {
          // Surface the server's actual reason — "unsupported format" and
          // "too large" need different fixes from the writer.
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Upload failed");
        }
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: number) {
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/images/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError("Couldn't remove that image.");
    }
  }

  const box = size === "sm" ? "h-12 w-12" : "h-20 w-20";

  return (
    <div
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files);
      }}
      className={dragging ? "rounded-sm ring-1 ring-fountain" : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        {items.map((image) => (
          <div key={image.id} className="group relative">
            {/* Served from our own route, so Next's image optimiser adds nothing here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/stories/${storyId}/images/${image.id}`}
              alt={image.caption || "Story image"}
              className={`${box} rounded-sm border border-ink-line object-cover`}
            />
            {!readOnly && (
              <button
                onClick={() => remove(image.id)}
                aria-label={`Remove image${image.caption ? `: ${image.caption}` : ""}`}
                className="absolute -right-1.5 -top-1.5 rounded-full border border-ink-line bg-ink p-0.5 text-paper/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-carbon focus:opacity-100"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}

        {!readOnly && (
          <>
            <label
              htmlFor={inputId}
              aria-label="Add image"
              className={`${box} flex cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-ink-line text-paper/30 hover:border-fountain hover:text-fountain`}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && upload(e.target.files)}
            />
          </>
        )}
      </div>
      {error && <p className="mt-1 font-mono text-[10px] text-carbon">{error}</p>}
    </div>
  );
}
