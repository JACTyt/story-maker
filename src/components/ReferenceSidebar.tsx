"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageStrip } from "./ImageStrip";
import { BookOpen, Check, Clock, Loader2, MapPin, Pencil, Plus, Sparkles, Trash2, Users, X } from "lucide-react";

type Character = { id: number; name: string; appearance: string; personality: string };
type NamedEntity = { id: number; name: string; description: string };
type TimelineEvent = { id: number; title: string; description: string };

type FieldValues = Record<string, string>;
type SectionItem = { id: number; title: string; values: FieldValues };
type ResourceKind = "characters" | "places" | "themes" | "timeline";

const IMAGE_ENTITY: Partial<Record<ResourceKind, "character" | "place">> = {
  characters: "character",
  places: "place",
};

const SUGGEST_TYPE: Partial<Record<ResourceKind, "character" | "place" | "theme">> = {
  characters: "character",
  places: "place",
  themes: "theme",
};

const FILTERS: { kind: ResourceKind; label: string; icon: React.ReactNode }[] = [
  { kind: "characters", label: "Characters", icon: <Users size={11} /> },
  { kind: "places", label: "Places", icon: <MapPin size={11} /> },
  { kind: "themes", label: "Themes", icon: <Sparkles size={11} /> },
  { kind: "timeline", label: "Timeline", icon: <Clock size={11} /> },
];

export function ReferenceSidebar({ storyId, refreshToken }: { storyId: string; refreshToken?: number }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<NamedEntity[]>([]);
  const [themes, setThemes] = useState<NamedEntity[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [visible, setVisible] = useState<Set<ResourceKind>>(
    () => new Set(["characters", "places", "themes", "timeline"])
  );

  const load = useCallback(() => {
    fetch(`/api/stories/${storyId}/characters`).then((r) => r.json()).then(setCharacters);
    fetch(`/api/stories/${storyId}/places`).then((r) => r.json()).then(setPlaces);
    fetch(`/api/stories/${storyId}/themes`).then((r) => r.json()).then(setThemes);
    fetch(`/api/stories/${storyId}/timeline`).then((r) => r.json()).then(setTimeline);
  }, [storyId]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const hasNothing =
    characters.length === 0 && places.length === 0 && themes.length === 0 && timeline.length === 0;

  function toggleFilter(kind: ResourceKind) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  return (
    <aside className="flex h-full flex-col overflow-y-auto bg-ink-wash p-4">
      <h2 className="mb-3 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">
        <BookOpen size={13} /> Story bible
      </h2>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(({ kind, label, icon }) => (
          <button
            key={kind}
            onClick={() => toggleFilter(kind)}
            aria-pressed={visible.has(kind)}
            className={`flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${
              visible.has(kind)
                ? "border-fountain/50 bg-fountain-wash text-fountain"
                : "border-ink-line text-ink-faint hover:text-paper/70"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>
      {hasNothing && (
        <p className="font-mono text-xs text-ink-faint">
          Nothing recorded yet — accept a suggestion, or add an entry with the buttons below.
        </p>
      )}
      {visible.has("characters") && (
        <ReferenceSection
          icon={<Users size={11} />}
          heading="Characters"
          storyId={storyId}
          kind="characters"
          singular="character"
          bodyKey="name"
          bodyFields={[
            { key: "appearance", label: "Appearance" },
            { key: "personality", label: "Personality" },
          ]}
          items={characters.map((c) => ({
            id: c.id,
            title: c.name,
            values: { appearance: c.appearance, personality: c.personality },
          }))}
          onSaved={(id, patch) =>
            setCharacters((prev) =>
              prev.map((c) =>
                c.id === id
                  ? { ...c, name: patch.title, appearance: patch.values.appearance, personality: patch.values.personality }
                  : c
              )
            )
          }
          onDeleted={(id) => setCharacters((prev) => prev.filter((c) => c.id !== id))}
          onCreated={(row) => setCharacters((prev) => [...prev, row as unknown as Character])}
        />
      )}
      {visible.has("places") && (
        <ReferenceSection
          icon={<MapPin size={11} />}
          heading="Places"
          storyId={storyId}
          kind="places"
          singular="place"
          bodyKey="name"
          bodyFields={[{ key: "description", label: "Description" }]}
          items={places.map((p) => ({ id: p.id, title: p.name, values: { description: p.description } }))}
          onSaved={(id, patch) =>
            setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, name: patch.title, description: patch.values.description } : p)))
          }
          onDeleted={(id) => setPlaces((prev) => prev.filter((p) => p.id !== id))}
          onCreated={(row) => setPlaces((prev) => [...prev, row as unknown as NamedEntity])}
        />
      )}
      {visible.has("themes") && (
        <ReferenceSection
          icon={<Sparkles size={11} />}
          heading="Themes"
          storyId={storyId}
          kind="themes"
          singular="theme"
          bodyKey="name"
          bodyFields={[{ key: "description", label: "Description" }]}
          items={themes.map((t) => ({ id: t.id, title: t.name, values: { description: t.description } }))}
          onSaved={(id, patch) =>
            setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, name: patch.title, description: patch.values.description } : t)))
          }
          onDeleted={(id) => setThemes((prev) => prev.filter((t) => t.id !== id))}
          onCreated={(row) => setThemes((prev) => [...prev, row as unknown as NamedEntity])}
        />
      )}
      {visible.has("timeline") && (
        <ReferenceSection
          icon={<Clock size={11} />}
          heading="Timeline"
          storyId={storyId}
          kind="timeline"
          singular="timeline"
          bodyKey="title"
          bodyFields={[{ key: "description", label: "Description" }]}
          items={timeline.map((t) => ({ id: t.id, title: t.title, values: { description: t.description } }))}
          onSaved={(id, patch) =>
            setTimeline((prev) => prev.map((t) => (t.id === id ? { ...t, title: patch.title, description: patch.values.description } : t)))
          }
          onDeleted={(id) => setTimeline((prev) => prev.filter((t) => t.id !== id))}
          onCreated={(row) => setTimeline((prev) => [...prev, row as unknown as TimelineEvent])}
        />
      )}
    </aside>
  );
}

function ReferenceSection({
  icon,
  heading,
  storyId,
  kind,
  singular,
  bodyKey,
  bodyFields,
  items,
  onSaved,
  onDeleted,
  onCreated,
}: {
  icon: React.ReactNode;
  heading: string;
  storyId: string;
  kind: ResourceKind;
  singular: string;
  bodyKey: "name" | "title";
  bodyFields: { key: string; label: string }[];
  items: SectionItem[];
  onSaved: (id: number, patch: { title: string; values: FieldValues }) => void;
  onDeleted: (id: number) => void;
  onCreated: (row: Record<string, unknown>) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<FieldValues>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValues, setNewValues] = useState<FieldValues>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);
  const suggestType = SUGGEST_TYPE[kind];

  function cancelCreate() {
    setCreating(false);
    setNewTitle("");
    setNewValues({});
    setCreateError(null);
  }

  async function create() {
    const name = newTitle.trim();
    if (!name) return;
    setSavingNew(true);
    setCreateError(null);
    try {
      const body: Record<string, string> = { [bodyKey]: name };
      for (const f of bodyFields) body[f.key] = newValues[f.key] ?? "";
      const res = await fetch(`/api/stories/${storyId}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Create failed");
      onCreated(await res.json());
      cancelCreate();
    } catch {
      setCreateError("Couldn't add — try again.");
    } finally {
      setSavingNew(false);
    }
  }

  function startEdit(item: SectionItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setValues(item.values);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function save(id: number) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/${kind}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [bodyKey]: title, ...values }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved(id, { title, values });
      setEditingId(null);
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function suggestDetails() {
    if (!suggestType || !title.trim()) return;
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/suggest-entity`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: suggestType, name: title.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Suggestion failed");
      setValues((prev) => ({ ...prev, ...body }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  }

  async function remove(id: number) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/${kind}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onDeleted(id);
    } catch {
      setError("Couldn't remove — try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mb-5">
      <h3 className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-carbon">
        {icon} {heading}
      </h3>
      {error && editingId === null && <p className="mb-2 text-[10px] text-carbon">{error}</p>}
      {creating ? (
        <div className="mb-3 space-y-1.5 rounded-sm border border-fountain/40 p-2">
          <input
            autoFocus
            placeholder="Name"
            className="w-full border-b border-fountain bg-transparent pb-0.5 font-display text-sm text-paper placeholder:text-paper/30 focus:outline-none"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          {bodyFields.map((f) => (
            <div key={f.key}>
              {bodyFields.length > 1 && (
                <div className="font-mono text-[9px] uppercase tracking-widest text-paper/40">{f.label}</div>
              )}
              <textarea
                placeholder={f.label}
                className="w-full resize-none bg-transparent text-xs leading-relaxed text-paper/70 placeholder:text-paper/25 focus:outline-none"
                value={newValues[f.key] ?? ""}
                onChange={(e) => setNewValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                rows={2}
              />
            </div>
          ))}
          {createError && <p className="text-[10px] text-carbon">{createError}</p>}
          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              onClick={create}
              disabled={savingNew || !newTitle.trim()}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-fountain hover:text-paper disabled:opacity-50"
            >
              <Check size={11} /> {savingNew ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelCreate}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-paper/40 hover:text-paper/70"
            >
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-paper/35 hover:text-fountain"
        >
          <Plus size={11} /> Add {singular}
        </button>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            {editingId === item.id ? (
              <div className="space-y-1.5 rounded-sm border border-fountain/40 p-2">
                <input
                  className="w-full border-b border-fountain bg-transparent pb-0.5 font-display text-sm text-paper focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {bodyFields.map((f) => (
                  <div key={f.key}>
                    {bodyFields.length > 1 && (
                      <div className="font-mono text-[9px] uppercase tracking-widest text-paper/40">{f.label}</div>
                    )}
                    <textarea
                      className="w-full resize-none bg-transparent text-xs leading-relaxed text-paper/70 focus:outline-none"
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      rows={2}
                    />
                  </div>
                ))}
                {error && <p className="text-[10px] text-carbon">{error}</p>}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <button
                    onClick={() => save(item.id)}
                    disabled={savingId === item.id}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-fountain hover:text-paper disabled:opacity-50"
                  >
                    <Check size={11} /> {savingId === item.id ? "Saving..." : "Save"}
                  </button>
                  {suggestType && (
                    <button
                      onClick={suggestDetails}
                      disabled={suggesting || !title.trim()}
                      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-paper/50 hover:text-fountain disabled:opacity-40"
                    >
                      {suggesting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      {suggesting ? "Regenerating..." : "Regenerate"}
                    </button>
                  )}
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-paper/40 hover:text-paper/70"
                  >
                    <X size={11} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-sm text-paper">{item.title}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      aria-label={`Edit ${item.title}`}
                      className="text-paper/30 hover:text-fountain"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      aria-label={`Delete ${item.title}`}
                      disabled={deletingId === item.id}
                      className="text-paper/30 hover:text-carbon disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {IMAGE_ENTITY[kind] && (
                  <div className="mt-1.5">
                    <ImageStrip
                      storyId={storyId}
                      entityType={IMAGE_ENTITY[kind]!}
                      entityId={item.id}
                      size="sm"
                      readOnly
                    />
                  </div>
                )}
                {bodyFields.map((f) =>
                  item.values[f.key] ? (
                    <div key={f.key} className="mt-1">
                      {bodyFields.length > 1 && (
                        <div className="font-mono text-[9px] uppercase tracking-widest text-paper/30">{f.label}</div>
                      )}
                      <p className="text-xs leading-relaxed text-paper/60">{item.values[f.key]}</p>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
