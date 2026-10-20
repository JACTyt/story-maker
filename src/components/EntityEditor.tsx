"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { RESOURCE_PATH, portraitUrl, type BibleState } from "@/lib/bibleClient";
import { entityKey, parseEntityKey, type EntityKind } from "@/lib/mentions";
import { ImageStrip } from "./ImageStrip";
import { Portrait, TypeChip, TYPE_LABEL } from "./EntityBits";

type Values = Record<string, string | number | null | number[]>;

type FieldKind = "text" | "textarea" | "aliases" | "role" | "number" | "place" | "chapters" | "characters";
type Field = { key: string; label: string; kind: FieldKind; hint?: string };

const FIELDS: Record<EntityKind, Field[]> = {
  character: [
    { key: "name", label: "Name", kind: "text" },
    { key: "aliases", label: "Also called", kind: "aliases", hint: "Nicknames and other names used in the text, comma-separated" },
    { key: "role", label: "Role", kind: "role" },
    { key: "summary", label: "One-line summary", kind: "text", hint: "Shown on hover cards" },
    { key: "appearance", label: "Appearance", kind: "textarea" },
    { key: "personality", label: "Personality", kind: "textarea" },
    { key: "goals", label: "Goals", kind: "textarea" },
    { key: "backstory", label: "Backstory", kind: "textarea" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
  place: [
    { key: "name", label: "Name", kind: "text" },
    { key: "aliases", label: "Also called", kind: "aliases", hint: "Other names used in the text, comma-separated" },
    { key: "kind", label: "Kind", kind: "text", hint: "City, building, room, vessel…" },
    { key: "parentPlaceId", label: "Inside", kind: "place" },
    { key: "summary", label: "One-line summary", kind: "text", hint: "Shown on hover cards" },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  timeline: [
    { key: "title", label: "Event", kind: "text" },
    { key: "aliases", label: "Also called", kind: "aliases", hint: "How the text refers to it, comma-separated" },
    { key: "inStoryDateLabel", label: "When", kind: "text", hint: "In-story date or label" },
    { key: "sortOrder", label: "Order", kind: "number" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "placeId", label: "Where", kind: "place" },
    { key: "chapterIds", label: "Chapters", kind: "chapters" },
    { key: "characterIds", label: "Characters involved", kind: "characters" },
  ],
  theme: [
    { key: "name", label: "Name", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
  ],
};

const ROLES = ["", "protagonist", "antagonist", "supporting", "minor"];
const SUGGESTABLE: EntityKind[] = ["character", "place", "theme"];
const inputCls =
  "w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent";

function emptyValues(type: EntityKind, name: string): Values {
  const v: Values = {};
  for (const f of FIELDS[type]) {
    v[f.key] = f.kind === "chapters" || f.kind === "characters" ? [] : f.kind === "place" ? null : f.kind === "number" ? 0 : "";
  }
  v[type === "timeline" ? "title" : "name"] = name;
  return v;
}

function toPayload(type: EntityKind, values: Values) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS[type]) {
    const value = values[f.key];
    if (f.kind === "aliases") out[f.key] = String(value ?? "").split(",").map((a) => a.trim()).filter(Boolean);
    else if (f.kind === "number") out[f.key] = Number(value) || 0;
    else out[f.key] = value;
  }
  return out;
}

export type EntityTarget = { key: string } | { create: EntityKind; name: string };

export function EntityEditor({
  storyId,
  bible,
  target,
  onSaved,
  onDeleted,
  onOpenEntity,
}: {
  storyId: string;
  bible: BibleState;
  target: EntityTarget;
  onSaved?: (key: string) => void;
  onDeleted?: () => void;
  onOpenEntity?: (key: string) => void;
}) {
  const creating = "create" in target;
  const { type, id } = creating ? { type: target.create, id: null } : parseEntityKey(target.key);
  const data = bible.bible;

  const row = useMemo(() => {
    if (creating || !data) return null;
    const list = { character: data.characters, place: data.places, timeline: data.timeline, theme: data.themes }[type] as { id: number }[];
    return (list.find((r) => r.id === id) ?? null) as Values | null;
  }, [creating, data, type, id]);

  const [values, setValues] = useState<Values>(() => emptyValues(type, creating ? target.name : ""));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switching entries, or the saved row coming back from the server, resets the form.
  const targetId = creating ? `new:${target.create}:${target.name}` : target.key;
  const [syncedWith, setSyncedWith] = useState<{ targetId: string; row: Values | null } | null>(null);
  if (!syncedWith || syncedWith.targetId !== targetId || syncedWith.row !== row) {
    setSyncedWith({ targetId, row });
    if (creating) setValues(emptyValues(type, target.name));
    else if (row) {
      const v: Values = { ...row };
      if (Array.isArray(row.aliases)) v.aliases = (row.aliases as unknown as string[]).join(", ");
      setValues(v);
    }
    setDirty(false);
    setError(null);
  }

  if (!data) return <p className="p-4 text-sm text-muted">Loading…</p>;
  if (!creating && !row) return <p className="p-4 text-sm text-muted">This entry no longer exists.</p>;

  const set = (key: string, value: Values[string]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };
  const nameKey = type === "timeline" ? "title" : "name";
  const name = String(values[nameKey] ?? "");
  const key = creating ? null : entityKey(type, id!);
  const url = `/api/stories/${storyId}/${RESOURCE_PATH[type]}`;

  async function save() {
    if (!name.trim()) return setError("A name is required.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(creating ? url : `${url}/${id}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toPayload(type, values)),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      await bible.refresh();
      setDirty(false);
      onSaved?.(entityKey(type, saved.id));
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (creating) return;
    await fetch(`${url}/${id}`, { method: "DELETE" });
    await bible.refresh();
    onDeleted?.();
  }

  async function suggest() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/suggest-entity`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Suggestion failed");
      setValues((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(body)) {
          // Never overwrite what the writer already typed.
          if (prev[k] && String(prev[k]).trim()) continue;
          next[k] = Array.isArray(v) ? v.join(", ") : (v as string);
        }
        return next;
      });
      setDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  }

  const view = key ? bible.byKey.get(key) : { name: name || "New", type };
  const heroUrl = key ? portraitUrl(storyId, data, key) : null;
  const appearances = key ? (data.appearances[key] ?? []) : [];
  const chapterTitle = (chapterId: number) => data.chapters.find((c) => c.id === chapterId)?.title ?? "Chapter";

  function field(f: Field) {
    const value = values[f.key];
    switch (f.kind) {
      case "textarea":
        return <textarea className={`${inputCls} min-h-20 resize-y`} value={String(value ?? "")} onChange={(e) => set(f.key, e.target.value)} />;
      case "role":
        return (
          <select className={inputCls} value={String(value ?? "")} onChange={(e) => set(f.key, e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r || "—"}
              </option>
            ))}
          </select>
        );
      case "number":
        return <input type="number" className={inputCls} value={Number(value ?? 0)} onChange={(e) => set(f.key, Number(e.target.value))} />;
      case "place":
        return (
          <select className={inputCls} value={value === null || value === undefined ? "" : String(value)} onChange={(e) => set(f.key, e.target.value ? Number(e.target.value) : null)}>
            <option value="">—</option>
            {data!.places
              .filter((p) => !(type === "place" && p.id === id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        );
      case "chapters":
      case "characters": {
        const options = f.kind === "chapters" ? data!.chapters.map((c) => ({ id: c.id, label: c.title })) : data!.characters.map((c) => ({ id: c.id, label: c.name }));
        const selected = (value as number[]) ?? [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {options.length === 0 && <span className="text-xs text-muted">None yet.</span>}
            {options.map((o) => {
              const on = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set(f.key, on ? selected.filter((x) => x !== o.id) : [...selected, o.id])}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-accent bg-accent text-accent-fg" : "border-line text-muted hover:text-fg"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      }
      default:
        return <input className={inputCls} value={String(value ?? "")} onChange={(e) => set(f.key, e.target.value)} />;
    }
  }

  return (
    <div className="space-y-5">
      {heroUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroUrl} alt={`${name} — main portrait`} className="max-h-80 w-full rounded-xl bg-surface-2 object-contain" />
      )}
      <div className="flex items-center gap-3">
        {view && !heroUrl && <Portrait entity={view} src={null} size={64} />}
        <div className="min-w-0">
          <h3 className="truncate text-xl font-semibold">{name || `New ${TYPE_LABEL[type].toLowerCase()}`}</h3>
          <TypeChip type={type} />
        </div>
      </div>

      {key && (type === "character" || type === "place") && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">Images</h4>
          <ImageStrip storyId={storyId} entityType={type} entityId={id!} onChanged={bible.refresh} />
        </section>
      )}

      <section className="space-y-3">
        {FIELDS[type].map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-muted">{f.label}</span>
            {field(f)}
            {f.hint && <span className="mt-0.5 block text-[11px] text-muted">{f.hint}</span>}
          </label>
        ))}
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={saving || (!dirty && !creating)} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg disabled:opacity-40">
          {saving && <Loader2 size={13} className="animate-spin" />}
          {creating ? `Add ${TYPE_LABEL[type].toLowerCase()}` : "Save"}
        </button>
        {SUGGESTABLE.includes(type) && (
          <button onClick={suggest} disabled={suggesting || !name.trim()} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm disabled:opacity-40">
            {suggesting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Fill empty fields with AI
          </button>
        )}
        <span className="flex-1" />
        {!creating && (
          <button onClick={remove} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted hover:text-danger">
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      {key && type === "character" && <Relationships storyId={storyId} bible={bible} characterId={id!} onOpenEntity={onOpenEntity} />}

      {key && type !== "theme" && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">Appears in</h4>
          {appearances.length === 0 ? (
            <p className="text-sm text-muted">Not mentioned in any chapter yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {appearances.map((a) => (
                <li key={a.chapterId}>
                  <Link href={`/stories/${storyId}/chapters/${a.chapterId}?focus=${key}`} className="hover:text-accent">
                    {chapterTitle(a.chapterId)}
                  </Link>
                  <span className="text-muted"> · {a.count} mention{a.count === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Relationships({
  storyId,
  bible,
  characterId,
  onOpenEntity,
}: {
  storyId: string;
  bible: BibleState;
  characterId: number;
  onOpenEntity?: (key: string) => void;
}) {
  const data = bible.bible!;
  const [other, setOther] = useState("");
  const [label, setLabel] = useState("");
  const nameOf = (id: number) => data.characters.find((c) => c.id === id)?.name ?? "?";
  const mine = data.relationships.filter((r) => r.fromCharacterId === characterId || r.toCharacterId === characterId);
  const base = `/api/stories/${storyId}/relationships`;

  async function add() {
    if (!other) return;
    await fetch(base, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromCharacterId: characterId, toCharacterId: Number(other), label: label.trim() }),
    });
    setOther("");
    setLabel("");
    bible.refresh();
  }

  async function remove(id: number) {
    await fetch(`${base}/${id}`, { method: "DELETE" });
    bible.refresh();
  }

  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">Relationships</h4>
      <ul className="mb-2 space-y-1 text-sm">
        {mine.length === 0 && <li className="text-muted">None yet.</li>}
        {mine.map((r) => {
          const outgoing = r.fromCharacterId === characterId;
          const otherId = outgoing ? r.toCharacterId : r.fromCharacterId;
          return (
            <li key={r.id} className="group flex items-center gap-2">
              <span className="text-muted">{outgoing ? r.label || "related to" : `${r.label || "related to"} (from)`}</span>
              <button onClick={() => onOpenEntity?.(entityKey("character", otherId))} className="font-medium hover:text-accent">
                {nameOf(otherId)}
              </button>
              <button onClick={() => remove(r.id)} aria-label="Remove relationship" className="text-muted opacity-0 hover:text-danger group-hover:opacity-100">
                <X size={12} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-1.5">
        <input className={inputCls} placeholder="e.g. sister, rival, owes a favour" value={label} onChange={(e) => setLabel(e.target.value)} />
        <select className={`${inputCls} w-36`} value={other} onChange={(e) => setOther(e.target.value)} aria-label="Related character">
          <option value="">Character…</option>
          {data.characters
            .filter((c) => c.id !== characterId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <button onClick={add} disabled={!other} aria-label="Add relationship" className="rounded-md border border-line px-2 disabled:opacity-40">
          <Plus size={14} />
        </button>
      </div>
    </section>
  );
}
