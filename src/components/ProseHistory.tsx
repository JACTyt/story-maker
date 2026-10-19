"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RotateCcw, SplitSquareHorizontal } from "lucide-react";
import { diffLines } from "@/lib/diff";

type ProseVersionRow = {
  id: number;
  content: string;
  source: "generated" | "edited" | "imported" | "reverted";
  model: string | null;
  createdAt: number | string;
};

const SOURCE_LABEL: Record<ProseVersionRow["source"], string> = {
  generated: "Generated",
  edited: "Your edit",
  imported: "Imported",
  reverted: "Restored",
};

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function formatWhen(value: number | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export function ProseHistory({
  storyId,
  chapterId,
  refreshToken,
  onReverted,
}: {
  storyId: string;
  chapterId: string;
  refreshToken: number;
  onReverted: (content: string) => void;
}) {
  const [versions, setVersions] = useState<ProseVersionRow[]>([]);
  const [comparingId, setComparingId] = useState<number | null>(null);
  const [revertingId, setRevertingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const versionsUrl = `/api/stories/${storyId}/chapters/${chapterId}/versions`;

  const load = useCallback(() => {
    fetch(versionsUrl)
      .then((r) => r.json())
      .then((rows) => setVersions(Array.isArray(rows) ? rows : []))
      .catch(() => setError("Couldn't load the draft history."));
  }, [versionsUrl]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  async function revert(id: number) {
    setRevertingId(id);
    setError(null);
    try {
      const res = await fetch(`${versionsUrl}/${id}/revert`, { method: "POST" });
      if (!res.ok) throw new Error("Revert failed");
      const restored = await res.json();
      onReverted(restored.content);
      load();
    } catch {
      setError("Couldn't restore that draft — try again.");
    } finally {
      setRevertingId(null);
    }
  }

  const current = versions[0];

  if (versions.length === 0) {
    return (
      <p className="font-mono text-xs text-ink-faint">
        No drafts saved yet — generate this chapter and every version is kept here.
      </p>
    );
  }

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        <History size={11} /> Draft history
      </h3>
      {error && <p className="mb-2 font-mono text-[10px] text-carbon">{error}</p>}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="rounded-sm border border-ink-line p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-paper/70">
                {SOURCE_LABEL[v.source] ?? v.source}
                {v.id === current.id && <span className="ml-1.5 text-fountain">· current</span>}
              </span>
              <span className="font-mono text-[10px] text-ink-faint">
                {wordCount(v.content)} words{v.model ? ` · ${v.model}` : ""}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-ink-faint">{formatWhen(v.createdAt)}</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {v.id !== current.id && (
                <>
                  <button
                    onClick={() => revert(v.id)}
                    disabled={revertingId === v.id}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-fountain hover:text-paper disabled:opacity-50"
                  >
                    {revertingId === v.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                    Restore
                  </button>
                  <button
                    onClick={() => setComparingId((prev) => (prev === v.id ? null : v.id))}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-paper/40 hover:text-fountain"
                  >
                    <SplitSquareHorizontal size={11} />
                    {comparingId === v.id ? "Hide" : "Compare"}
                  </button>
                </>
              )}
            </div>
            {comparingId === v.id && (
              <div className="mt-2 space-y-0.5 border-t border-ink-line pt-2 font-mono text-[10px] leading-relaxed">
                {diffLines(v.content, current.content).map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.type === "added"
                        ? "text-fountain"
                        : line.type === "removed"
                          ? "text-carbon line-through"
                          : "text-paper/40"
                    }
                  >
                    <span aria-hidden className="select-none pr-1 opacity-60">
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
