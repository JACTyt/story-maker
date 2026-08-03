"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, Clapperboard, Clock, Pencil, Sparkles, Users, X } from "lucide-react";

type NamedEntity = { id: number; name: string; description: string };
type Scene = { id: number; title: string; description: string };
type TimelineEvent = { id: number; title: string; description: string };

type SectionItem = { id: number; title: string; description: string };
type ResourceKind = "characters" | "scenes" | "themes" | "timeline";

export function ReferenceSidebar({ storyId, refreshToken }: { storyId: string; refreshToken?: number }) {
  const [characters, setCharacters] = useState<NamedEntity[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [themes, setThemes] = useState<NamedEntity[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const load = useCallback(() => {
    fetch(`/api/stories/${storyId}/characters`).then((r) => r.json()).then(setCharacters);
    fetch(`/api/stories/${storyId}/scenes`).then((r) => r.json()).then(setScenes);
    fetch(`/api/stories/${storyId}/themes`).then((r) => r.json()).then(setThemes);
    fetch(`/api/stories/${storyId}/timeline`).then((r) => r.json()).then(setTimeline);
  }, [storyId]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const hasNothing =
    characters.length === 0 && scenes.length === 0 && themes.length === 0 && timeline.length === 0;

  return (
    <aside className="flex h-full flex-col overflow-y-auto bg-ink-wash p-4">
      <h2 className="mb-4 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">
        <BookOpen size={13} /> Story bible
      </h2>
      {hasNothing && (
        <p className="font-mono text-xs text-ink-faint">
          Nothing recorded yet — accept a suggestion, or add entries from Characters, Scenes, or Themes.
        </p>
      )}
      <ReferenceSection
        icon={<Users size={11} />}
        heading="Characters"
        storyId={storyId}
        kind="characters"
        bodyKey="name"
        items={characters.map((c) => ({ id: c.id, title: c.name, description: c.description }))}
        onSaved={(id, patch) =>
          setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, name: patch.title, description: patch.description } : c)))
        }
      />
      <ReferenceSection
        icon={<Clapperboard size={11} />}
        heading="Scenes"
        storyId={storyId}
        kind="scenes"
        bodyKey="title"
        items={scenes.map((s) => ({ id: s.id, title: s.title, description: s.description }))}
        onSaved={(id, patch) =>
          setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, title: patch.title, description: patch.description } : s)))
        }
      />
      <ReferenceSection
        icon={<Sparkles size={11} />}
        heading="Themes"
        storyId={storyId}
        kind="themes"
        bodyKey="name"
        items={themes.map((t) => ({ id: t.id, title: t.name, description: t.description }))}
        onSaved={(id, patch) =>
          setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, name: patch.title, description: patch.description } : t)))
        }
      />
      <ReferenceSection
        icon={<Clock size={11} />}
        heading="Timeline"
        storyId={storyId}
        kind="timeline"
        bodyKey="title"
        items={timeline.map((t) => ({ id: t.id, title: t.title, description: t.description }))}
        onSaved={(id, patch) =>
          setTimeline((prev) => prev.map((t) => (t.id === id ? { ...t, title: patch.title, description: patch.description } : t)))
        }
      />
    </aside>
  );
}

function ReferenceSection({
  icon,
  heading,
  storyId,
  kind,
  bodyKey,
  items,
  onSaved,
}: {
  icon: React.ReactNode;
  heading: string;
  storyId: string;
  kind: ResourceKind;
  bodyKey: "name" | "title";
  items: SectionItem[];
  onSaved: (id: number, patch: { title: string; description: string }) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  if (items.length === 0) return null;

  function startEdit(item: SectionItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
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
        body: JSON.stringify({ [bodyKey]: title, description }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved(id, { title, description });
      setEditingId(null);
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mb-5">
      <h3 className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-carbon">
        {icon} {heading}
      </h3>
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
                <textarea
                  className="w-full resize-none bg-transparent text-xs leading-relaxed text-paper/70 focus:outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
                {error && <p className="text-[10px] text-carbon">{error}</p>}
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => save(item.id)}
                    disabled={savingId === item.id}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-fountain hover:text-paper disabled:opacity-50"
                  >
                    <Check size={11} /> {savingId === item.id ? "Saving..." : "Save"}
                  </button>
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
                  <button
                    onClick={() => startEdit(item)}
                    aria-label={`Edit ${item.title}`}
                    className="text-paper/30 hover:text-fountain"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
                {item.description && <p className="text-xs leading-relaxed text-paper/60">{item.description}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
