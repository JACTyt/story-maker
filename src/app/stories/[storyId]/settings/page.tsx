"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Save, AlertCircle } from "lucide-react";

type StorySettings = {
  defaultProvider: string;
  defaultModel: string;
  ollamaHost: string;
  systemPrompt: string;
  temperature: number;
  extendedThinking: boolean;
  maxTokens: number;
};
type SaveState = "idle" | "saving" | "saved" | "error";

export default function SettingsPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  const [settings, setSettings] = useState<StorySettings | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch(`/api/stories/${storyId}`)
      .then((r) => r.json())
      .then((s) =>
        setSettings({
          defaultProvider: s.defaultProvider,
          defaultModel: s.defaultModel,
          ollamaHost: s.ollamaHost,
          systemPrompt: s.systemPrompt ?? "",
          temperature: s.temperature ?? 1,
          extendedThinking: s.extendedThinking ?? false,
          maxTokens: s.maxTokens ?? 4096,
        })
      );
  }, [storyId]);

  async function save() {
    if (!settings) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setSettings((prev) =>
        prev
          ? {
              defaultProvider: updated.defaultProvider ?? prev.defaultProvider,
              defaultModel: updated.defaultModel ?? prev.defaultModel,
              ollamaHost: updated.ollamaHost ?? prev.ollamaHost,
              systemPrompt: updated.systemPrompt ?? prev.systemPrompt,
              temperature: updated.temperature ?? prev.temperature,
              extendedThinking: updated.extendedThinking ?? prev.extendedThinking,
              maxTokens: updated.maxTokens ?? prev.maxTokens,
            }
          : prev
      );
      setSaveState("saved");
      setTimeout(() => setSaveState((prev) => (prev === "saved" ? "idle" : prev)), 2000);
    } catch {
      setSaveState("error");
    }
  }

  if (!settings) {
    return <main className="p-8 font-mono text-sm text-ink-faint">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link
        href={`/stories/${storyId}`}
        className="mb-6 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-paper/50 hover:text-fountain"
      >
        <ArrowLeft size={12} /> Back to story
      </Link>
      <h1 className="mb-1 font-display text-3xl font-medium text-paper">Settings</h1>
      <p className="mb-8 font-mono text-sm text-paper/50">Who&rsquo;s holding the pen for this story.</p>

      <div className="space-y-5 rounded-sm border border-ink-line bg-ink-wash p-5">
        <div>
          <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-faint">Provider</label>
          <select
            className="w-full rounded-sm border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-paper focus:border-fountain focus:outline-none"
            value={settings.defaultProvider}
            onChange={(e) => setSettings({ ...settings, defaultProvider: e.target.value })}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama (local)</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-faint">Model</label>
          <input
            className="w-full rounded-sm border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-paper focus:border-fountain focus:outline-none"
            value={settings.defaultModel}
            onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
          />
        </div>

        {settings.defaultProvider === "ollama" && (
          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-faint">
              Ollama host
            </label>
            <input
              className="w-full rounded-sm border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-paper focus:border-fountain focus:outline-none"
              value={settings.ollamaHost}
              onChange={(e) => setSettings({ ...settings, ollamaHost: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-faint">
            Custom instructions
          </label>
          <textarea
            rows={4}
            placeholder="Extra guidance for the assistant, e.g. tone, POV, style rules..."
            className="w-full resize-y rounded-sm border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-paper placeholder:text-ink-faint focus:border-fountain focus:outline-none"
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-ink-faint">
            Temperature
            <span className="text-paper/70">{settings.temperature.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(e) => setSettings({ ...settings, temperature: Number(e.target.value) })}
            className="w-full accent-fountain"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-faint">
            Max output tokens
          </label>
          <input
            type="number"
            min={256}
            max={64000}
            step={256}
            className="w-full rounded-sm border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-paper focus:border-fountain focus:outline-none"
            value={settings.maxTokens}
            onChange={(e) => setSettings({ ...settings, maxTokens: Number(e.target.value) })}
          />
        </div>

        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-faint">
          <input
            type="checkbox"
            checked={settings.extendedThinking}
            onChange={(e) => setSettings({ ...settings, extendedThinking: e.target.checked })}
            className="accent-fountain"
          />
          Extended thinking
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saveState === "saving"}
            className="flex items-center gap-1.5 rounded-sm bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink hover:bg-paper-dim disabled:opacity-50"
          >
            <Save size={13} /> {saveState === "saving" ? "Saving..." : "Save"}
          </button>
          {saveState === "saved" && (
            <span className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-fountain">
              <Check size={13} /> Saved
            </span>
          )}
          {saveState === "error" && (
            <span className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-carbon">
              <AlertCircle size={13} /> Couldn&rsquo;t save — try again
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
