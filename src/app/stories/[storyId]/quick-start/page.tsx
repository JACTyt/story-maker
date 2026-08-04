"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { VariantCard, type Variant } from "@/components/VariantCard";

type QuickStartResult = {
  characters: { name: string; appearance: string; personality: string }[];
  places: { name: string; description: string }[];
  themes: { name: string; description: string }[];
};

const CHARACTER_FIELDS = [
  { key: "appearance", label: "Appearance" },
  { key: "personality", label: "Personality" },
];
const DESCRIPTION_FIELDS = [{ key: "description", label: "Description" }];

const BLANK_CHARACTER: Variant = { name: "", checked: false, values: { appearance: "", personality: "" } };
const BLANK_DESCRIBED: Variant = { name: "", checked: false, values: { description: "" } };

function toCharacterVariants(items: { name: string; appearance: string; personality: string }[]): Variant[] {
  return items.map((i) => ({ name: i.name, checked: false, values: { appearance: i.appearance, personality: i.personality } }));
}

function toDescribedVariants(items: { name: string; description: string }[]): Variant[] {
  return items.map((i) => ({ name: i.name, checked: false, values: { description: i.description } }));
}

export default function QuickStartPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [characterVariants, setCharacterVariants] = useState<Variant[]>([]);
  const [placeVariants, setPlaceVariants] = useState<Variant[]>([]);
  const [themeVariants, setThemeVariants] = useState<Variant[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  async function generate() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/quick-start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Generation failed");

      const result = body as QuickStartResult;
      const total = result.characters.length + result.places.length + result.themes.length;
      setNotice(
        total === 0 ? "Didn't get anything usable back — try rephrasing, or just write your own below." : null
      );
      setCharacterVariants([...toCharacterVariants(result.characters), { ...BLANK_CHARACTER }]);
      setPlaceVariants([...toDescribedVariants(result.places), { ...BLANK_DESCRIBED }]);
      setThemeVariants([...toDescribedVariants(result.themes), { ...BLANK_DESCRIBED }]);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveOne(path: string, body: Record<string, string>, label: string): Promise<string | null> {
    const res = await fetch(`/api/stories/${storyId}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? null : label;
  }

  async function addSelected() {
    setSaving(true);
    setSaveErrors([]);
    const failures: string[] = [];

    for (const v of characterVariants) {
      if (v.checked && v.name.trim()) {
        const failure = await saveOne(
          "characters",
          { name: v.name, appearance: v.values.appearance ?? "", personality: v.values.personality ?? "" },
          v.name
        );
        if (failure) failures.push(failure);
      }
    }
    for (const v of placeVariants) {
      if (v.checked && v.name.trim()) {
        const failure = await saveOne("places", { name: v.name, description: v.values.description ?? "" }, v.name);
        if (failure) failures.push(failure);
      }
    }
    for (const v of themeVariants) {
      if (v.checked && v.name.trim()) {
        const failure = await saveOne("themes", { name: v.name, description: v.values.description ?? "" }, v.name);
        if (failure) failures.push(failure);
      }
    }

    setSaving(false);
    if (failures.length > 0) {
      setSaveErrors(failures);
    } else {
      router.push(`/stories/${storyId}`);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/stories/${storyId}`}
        className="mb-6 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-paper/50 hover:text-fountain"
      >
        <ArrowLeft size={12} /> Back to story
      </Link>
      <h1 className="mb-1 font-display text-3xl font-medium text-paper">Quick start</h1>
      <p className="mb-8 font-mono text-sm text-paper/50">Describe your story, and pick from what comes back.</p>

      <div className="mb-8 max-w-xl space-y-2">
        <textarea
          className="min-h-24 w-full resize-none rounded-sm border border-ink-line bg-ink-wash p-3 text-paper placeholder:text-ink-faint focus:border-fountain focus:outline-none"
          placeholder="What's this story about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-sm bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {error && (
        <div className="mb-8 flex items-center justify-between rounded-sm border border-carbon bg-carbon-wash px-3 py-2 text-carbon">
          <span>{error}</span>
          <button onClick={generate} className="flex items-center gap-1 underline hover:text-paper">
            <RotateCcw size={12} /> Try again
          </button>
        </div>
      )}

      {generated && (
        <>
          {notice && <p className="mb-6 font-mono text-sm text-ink-faint">{notice}</p>}

          <VariantSection
            heading="Characters"
            nameLabel="Name"
            fields={CHARACTER_FIELDS}
            variants={characterVariants}
            onChangeAt={(i, next) =>
              setCharacterVariants((prev) => prev.map((v, idx) => (idx === i ? next : v)))
            }
          />
          <VariantSection
            heading="Places"
            nameLabel="Name"
            fields={DESCRIPTION_FIELDS}
            variants={placeVariants}
            onChangeAt={(i, next) => setPlaceVariants((prev) => prev.map((v, idx) => (idx === i ? next : v)))}
          />
          <VariantSection
            heading="Themes"
            nameLabel="Name"
            fields={DESCRIPTION_FIELDS}
            variants={themeVariants}
            onChangeAt={(i, next) => setThemeVariants((prev) => prev.map((v, idx) => (idx === i ? next : v)))}
          />

          {saveErrors.length > 0 && (
            <p className="mb-4 text-carbon">Couldn&rsquo;t save: {saveErrors.join(", ")}. Try again.</p>
          )}
          <button
            onClick={addSelected}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-sm bg-paper px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? "Saving..." : "Add selected to story bible"}
          </button>
        </>
      )}
    </main>
  );
}

function VariantSection({
  heading,
  nameLabel,
  fields,
  variants,
  onChangeAt,
}: {
  heading: string;
  nameLabel: string;
  fields: { key: string; label: string }[];
  variants: Variant[];
  onChangeAt: (index: number, next: Variant) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">{heading}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {variants.map((v, i) => (
          <VariantCard key={i} variant={v} nameLabel={nameLabel} fields={fields} onChange={(next) => onChangeAt(i, next)} />
        ))}
      </div>
    </section>
  );
}
