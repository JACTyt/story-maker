"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";

type Field = { key: string; label: string; multiline?: boolean };
type SuggestableResourcePath = "characters" | "places" | "themes";
const SUGGEST_TYPE: Record<SuggestableResourcePath, "character" | "place" | "theme"> = {
  characters: "character",
  places: "place",
  themes: "theme",
};

import { ImageStrip } from "./ImageStrip";

// Only these two entity kinds have a visual identity worth attaching.
const IMAGE_ENTITY: Partial<Record<"characters" | "places" | "themes" | "timeline", "character" | "place">> = {
  characters: "character",
  places: "place",
};

export function EntityListPage({
  storyId,
  resourcePath,
  title,
  fields,
}: {
  storyId: string;
  resourcePath: "characters" | "places" | "themes" | "timeline";
  title: string;
  fields: Field[];
}) {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [editSuggesting, setEditSuggesting] = useState(false);
  const [editSuggestError, setEditSuggestError] = useState<string | null>(null);

  const url = `/api/stories/${storyId}/${resourcePath}`;
  const isTimeline = resourcePath === "timeline";
  const nameKey = fields[0]?.key ?? "name";

  useEffect(() => {
    fetch(url).then((r) => r.json()).then(setItems);
  }, [url]);

  async function fetchSuggestion(name: string): Promise<Record<string, string>> {
    const res = await fetch(`/api/stories/${storyId}/suggest-entity`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: SUGGEST_TYPE[resourcePath as SuggestableResourcePath], name }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Suggestion failed");
    return body;
  }

  async function suggestDetails() {
    const name = form[nameKey]?.trim();
    if (!name || isTimeline) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const body = await fetchSuggestion(name);
      setForm((prev) => ({ ...prev, ...body }));
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  }

  async function suggestEditDetails() {
    const name = editForm[nameKey]?.trim();
    if (!name || isTimeline) return;
    setEditSuggesting(true);
    setEditSuggestError(null);
    try {
      const body = await fetchSuggestion(name);
      setEditForm((prev) => ({ ...prev, ...body }));
    } catch (err) {
      setEditSuggestError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setEditSuggesting(false);
    }
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setItems((prev) => [...prev, created]);
      setForm({});
    }
  }

  async function removeItem(id: number) {
    await fetch(`${url}/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function startEdit(item: Record<string, any>) {
    setEditingId(item.id);
    setEditForm(Object.fromEntries(fields.map((f) => [f.key, String(item[f.key] ?? "")])));
    setEditSuggestError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setEditSuggestError(null);
  }

  async function saveEdit(id: number) {
    const res = await fetch(`${url}/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      cancelEdit();
    }
  }

  function editFields(item: Record<string, any>) {
    return (
      <div className="space-y-2">
        {fields.map((f) =>
          f.multiline ? (
            <textarea
              key={f.key}
              className="w-full resize-none rounded-sm border border-fountain bg-ink px-2 py-1.5 text-sm text-paper focus:outline-none"
              placeholder={f.label}
              value={editForm[f.key] ?? ""}
              onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              rows={4}
            />
          ) : (
            <input
              key={f.key}
              className="w-full rounded-sm border border-fountain bg-ink px-2 py-1.5 text-sm text-paper focus:outline-none"
              placeholder={f.label}
              value={editForm[f.key] ?? ""}
              onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          )
        )}
        {editSuggestError && <p className="font-mono text-xs text-carbon">{editSuggestError}</p>}
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={() => saveEdit(item.id)}
            className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-fountain underline hover:text-paper"
          >
            <Check size={12} /> Save
          </button>
          {!isTimeline && (
            <button
              onClick={suggestEditDetails}
              disabled={editSuggesting || !editForm[nameKey]?.trim()}
              className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-paper/60 underline hover:text-fountain disabled:opacity-40"
            >
              {editSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {editSuggesting ? "Regenerating..." : "Regenerate"}
            </button>
          )}
          <button
            onClick={cancelEdit}
            className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-ink-faint underline hover:text-paper/70"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/stories/${storyId}`}
        className="mb-6 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-paper/50 hover:text-fountain"
      >
        <ArrowLeft size={12} /> Back to story
      </Link>
      <h1 className="mb-8 font-display text-3xl font-medium text-paper">{title}</h1>

      <form onSubmit={createItem} className="mb-10 max-w-md space-y-2">
        {fields.map((f) =>
          f.multiline ? (
            <textarea
              key={f.key}
              className="w-full resize-none rounded-sm border border-ink-line bg-ink-wash p-2 text-paper placeholder:text-ink-faint focus:border-fountain focus:outline-none"
              placeholder={f.label}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          ) : (
            <input
              key={f.key}
              className="w-full rounded-sm border border-ink-line bg-ink-wash p-2 text-paper placeholder:text-ink-faint focus:border-fountain focus:outline-none"
              placeholder={f.label}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          )
        )}
        {suggestError && <p className="font-mono text-xs text-carbon">{suggestError}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-sm bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim"
          >
            <Plus size={13} /> Add to the record
          </button>
          {!isTimeline && (
            <button
              type="button"
              onClick={suggestDetails}
              disabled={suggesting || !form[nameKey]?.trim()}
              className="flex items-center gap-1.5 rounded-sm border border-ink-line px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper/70 hover:border-fountain hover:text-fountain disabled:opacity-40"
            >
              {suggesting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {suggesting ? "Suggesting..." : "Suggest"}
            </button>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        <p className="font-mono text-sm text-ink-faint">Nothing recorded yet.</p>
      ) : isTimeline ? (
        <ol className="space-y-0 border-l-2 border-carbon/50 pl-6">
          {items.map((item) => (
            <li key={item.id} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-carbon bg-ink" />
              {editingId === item.id ? (
                editFields(item)
              ) : (
                <>
                  {item.inStoryDateLabel && (
                    <div className="mb-1 font-mono text-xs uppercase tracking-widest text-carbon">
                      {item.inStoryDateLabel}
                    </div>
                  )}
                  <div className="mb-1 font-display text-xl text-paper">{item.title}</div>
                  {item.description && (
                    <p className="max-w-lg text-sm text-paper/70">{item.description}</p>
                  )}
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => startEdit(item)}
                      className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-paper/40 underline hover:text-fountain"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-paper/40 underline hover:text-carbon"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="page-surface relative rounded-sm p-4">
              <span className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-ink/20" />
              {editingId === item.id ? (
                <div className="mt-2 text-ink">{editFields(item)}</div>
              ) : (
                <>
                  <div className="mb-1 mt-2 font-display text-lg">{item[fields[0].key]}</div>
                  {fields.slice(1).map((f) =>
                    item[f.key] ? (
                      <div key={f.key} className="mt-1.5">
                        {fields.length > 2 && (
                          <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40">{f.label}</div>
                        )}
                        <p className="text-sm text-ink/70">{item[f.key]}</p>
                      </div>
                    ) : null
                  )}
                  {IMAGE_ENTITY[resourcePath] && (
                    <div className="mt-3">
                      <ImageStrip
                        storyId={storyId}
                        entityType={IMAGE_ENTITY[resourcePath]!}
                        entityId={item.id}
                      />
                    </div>
                  )}
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => startEdit(item)}
                      className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-ink/40 underline hover:text-fountain-dim"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-ink/40 underline hover:text-carbon-dim"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
