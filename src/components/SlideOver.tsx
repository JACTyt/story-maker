"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { BibleState } from "@/lib/bibleClient";
import type { EntityKind } from "@/lib/mentions";
import { EntityEditor, type EntityTarget } from "./EntityEditor";
import { BibleList } from "./BibleList";
import { TYPE_LABEL } from "./EntityBits";

export type PanelTab = "entity" | "bible" | "history";

const TABS: [PanelTab, string][] = [
  ["entity", "Entity"],
  ["bible", "Bible"],
  ["history", "History"],
];

export function SlideOver({
  storyId,
  bible,
  tab,
  target,
  history,
  onTab,
  onTarget,
  onClose,
}: {
  storyId: string;
  bible: BibleState;
  tab: PanelTab | null;
  target: EntityTarget | null;
  history?: React.ReactNode;
  onTab: (tab: PanelTab) => void;
  onTarget: (target: EntityTarget | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!tab) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !(e.target as HTMLElement).closest("input, textarea, select") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, onClose]);

  const open = (key: string) => {
    onTarget({ key });
    onTab("entity");
  };
  const create = (type: EntityKind, name = "") => {
    onTarget({ create: type, name });
    onTab("entity");
  };

  return (
    <>
      {tab && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Story panel"
        aria-hidden={!tab}
        className={`slide-in fixed bottom-0 right-0 top-0 z-40 flex w-[min(440px,100vw)] flex-col border-l border-line bg-bg shadow-soft ${
          tab ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
          <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5" role="tablist">
            {TABS.filter(([t]) => t !== "history" || history).map(([t, label]) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => onTab(t)}
                className={`rounded-md px-3 py-1 text-sm ${tab === t ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "entity" &&
            (target ? (
              <>
                {"create" in target && (
                  <div className="mb-4 flex flex-wrap gap-1" role="radiogroup" aria-label="Entity type">
                    {(Object.keys(TYPE_LABEL) as EntityKind[]).map((t) => (
                      <button
                        key={t}
                        role="radio"
                        aria-checked={target.create === t}
                        onClick={() => onTarget({ create: t, name: target.name })}
                        className={`t-${t} rounded-full border px-2.5 py-0.5 text-xs ${
                          target.create === t ? "border-[var(--c)] text-[var(--c)]" : "border-line text-muted"
                        }`}
                      >
                        {TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
                <EntityEditor
                  storyId={storyId}
                  bible={bible}
                  target={target}
                  onSaved={(key) => onTarget({ key })}
                  onDeleted={() => {
                    onTarget(null);
                    onTab("bible");
                  }}
                  onOpenEntity={open}
                />
              </>
            ) : (
              <p className="text-sm text-muted">Pick something from the bible, or hover a highlighted name in the text.</p>
            ))}
          {tab === "bible" && (
            <BibleList storyId={storyId} bible={bible} activeKey={target && "key" in target ? target.key : null} onOpen={open} onCreate={(t) => create(t)} />
          )}
          {tab === "history" && history}
        </div>
      </aside>
    </>
  );
}
