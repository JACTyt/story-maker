"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Field = { key: string; label: string; multiline?: boolean };

export function EntityListPage({
  storyId,
  resourcePath,
  title,
  fields,
}: {
  storyId: string;
  resourcePath: "characters" | "scenes" | "themes" | "timeline";
  title: string;
  fields: Field[];
}) {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const url = `/api/stories/${storyId}/${resourcePath}`;
  const isTimeline = resourcePath === "timeline";

  useEffect(() => {
    fetch(url).then((r) => r.json()).then(setItems);
  }, [url]);

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
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
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
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => saveEdit(item.id)}
            className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-fountain underline hover:text-paper"
          >
            <Check size={12} /> Save
          </button>
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
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-sm bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim"
        >
          <Plus size={13} /> Add to the record
        </button>
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
                  {item[fields[1]?.key] && (
                    <p className="text-sm text-ink/70">{item[fields[1].key]}</p>
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
