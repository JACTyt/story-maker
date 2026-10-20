"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, X } from "lucide-react";

export type ImageEntityType = "character" | "place" | "chapter" | "story";

type ImageRow = { id: number; caption: string; mimeType: string; storedName: string; isPrimary?: boolean };

/** Full-size viewer: ←/→ to browse, Esc to close, caption edited in place. */
function Lightbox({
  storyId,
  items,
  index,
  readOnly,
  onIndex,
  onClose,
  onCaption,
}: {
  storyId: string;
  items: ImageRow[];
  index: number;
  readOnly: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
  onCaption: (id: number, caption: string) => void;
}) {
  const image = items[index];
  const [caption, setCaption] = useState(image.caption);
  const [shownId, setShownId] = useState(image.id);
  // Browsing to another image starts from that image's caption.
  if (shownId !== image.id) {
    setShownId(image.id);
    setCaption(image.caption);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndex]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-6" onClick={onClose} role="dialog" aria-label="Image viewer">
      <div className="flex max-h-full max-w-5xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/stories/${storyId}/images/${image.id}`}
          alt={image.caption || "Story image"}
          className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        {readOnly ? (
          image.caption && <p className="text-sm text-white/80">{image.caption}</p>
        ) : (
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => caption !== image.caption && onCaption(image.id, caption)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="Add a caption…"
            aria-label="Caption"
            className="w-96 max-w-full rounded-md bg-white/10 px-3 py-1.5 text-center text-sm text-white outline-none placeholder:text-white/50 focus:bg-white/15"
          />
        )}
        <p className="text-xs text-white/50">
          {index + 1} / {items.length} · ← → to browse · Esc to close
        </p>
      </div>
      {items.length > 1 && (
        <>
          <button aria-label="Previous image" onClick={(e) => (e.stopPropagation(), onIndex((index - 1 + items.length) % items.length))} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <ChevronLeft size={22} />
          </button>
          <button aria-label="Next image" onClick={(e) => (e.stopPropagation(), onIndex((index + 1) % items.length))} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <ChevronRight size={22} />
          </button>
        </>
      )}
      <button aria-label="Close viewer" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
        <X size={18} />
      </button>
    </div>
  );
}

export function ImageStrip({
  storyId,
  entityType,
  entityId,
  readOnly = false,
  size = "md",
  onChanged,
}: {
  storyId: string;
  entityType: ImageEntityType;
  entityId: number;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  /** Portrait or set changed — lets the page refresh portraits elsewhere. */
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const dragId = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const base = `/api/stories/${storyId}/images`;
  const listUrl = `${base}?entityType=${entityType}&entityId=${entityId}`;

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
        const res = await fetch(base, { method: "POST", body: form });
        if (!res.ok) {
          // Surface the server's actual reason — "unsupported format" and
          // "too large" need different fixes from the writer.
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Upload failed");
        }
      }
      load();
      onChanged?.();
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
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      load();
      onChanged?.();
    } catch {
      setError("Couldn't remove that image.");
    }
  }

  async function patch(id: number, body: { caption?: string; isPrimary?: boolean }) {
    const res = await fetch(`${base}/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return setError("Couldn't save that change.");
    load();
    if (body.isPrimary) onChanged?.();
  }

  async function reorder(fromId: number, toId: number) {
    if (fromId === toId) return;
    const ids = items.map((i) => i.id);
    ids.splice(ids.indexOf(fromId), 1);
    ids.splice(ids.indexOf(toId), 0, fromId);
    setItems(ids.map((id) => items.find((i) => i.id === id)!));
    await fetch(`${base}/reorder`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) });
  }

  const box = size === "sm" ? "h-14 w-14" : size === "lg" ? "h-40 w-40" : "h-24 w-24";

  return (
    <div
      onDragOver={(e) => {
        if (readOnly || dragId.current !== null) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (readOnly || dragId.current !== null) return;
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files);
      }}
      className={dragging ? "rounded-lg ring-2 ring-accent" : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        {items.map((image, index) => (
          <div
            key={image.id}
            className="group relative"
            draggable={!readOnly}
            onDragStart={() => (dragId.current = image.id)}
            onDragEnd={() => (dragId.current = null)}
            onDragOver={(e) => dragId.current !== null && e.preventDefault()}
            onDrop={(e) => {
              if (dragId.current === null) return;
              e.preventDefault();
              e.stopPropagation();
              reorder(dragId.current, image.id);
              dragId.current = null;
            }}
          >
            <button onClick={() => setViewing(index)} aria-label={`View image${image.caption ? `: ${image.caption}` : ""}`} className="block">
              {/* Served from our own route, so Next's image optimiser adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${base}/${image.id}`}
                alt={image.caption || "Story image"}
                className={`${box} rounded-lg border object-cover ${image.isPrimary ? "border-accent ring-1 ring-accent" : "border-line"}`}
              />
            </button>
            {!readOnly && (
              <>
                <button
                  onClick={() => patch(image.id, { isPrimary: true })}
                  aria-label={image.isPrimary ? "Main portrait" : "Make main portrait"}
                  title={image.isPrimary ? "Main portrait" : "Make main portrait"}
                  className={`absolute -left-1.5 -top-1.5 rounded-full border border-line bg-surface p-0.5 ${
                    image.isPrimary ? "text-accent" : "text-muted opacity-0 group-hover:opacity-100 focus:opacity-100"
                  }`}
                >
                  <Star size={11} fill={image.isPrimary ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => remove(image.id)}
                  aria-label={`Remove image${image.caption ? `: ${image.caption}` : ""}`}
                  className="absolute -right-1.5 -top-1.5 rounded-full border border-line bg-surface p-0.5 text-muted opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </>
            )}
          </div>
        ))}

        {!readOnly && (
          <>
            <label
              htmlFor={inputId}
              aria-label="Add image"
              title="Add image (or drop files here)"
              className={`${box} flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-muted hover:border-accent hover:text-accent`}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
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
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {viewing !== null && items[viewing] && (
        <Lightbox
          storyId={storyId}
          items={items}
          index={viewing}
          readOnly={readOnly}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          onCaption={(id, caption) => patch(id, { caption })}
        />
      )}
    </div>
  );
}
