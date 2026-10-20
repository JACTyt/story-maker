"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { EntityView } from "@/lib/bibleClient";
import type { EntityKind } from "@/lib/mentions";

export const TYPE_LABEL: Record<EntityKind, string> = {
  character: "Character",
  place: "Place",
  timeline: "Event",
  theme: "Theme",
};

/** Portrait image, or initials on the entity type's colour when there is none. */
export function Portrait({ entity, src, size = 32 }: { entity: Pick<EntityView, "name" | "type">; src: string | null; size?: number }) {
  const round = entity.type === "character";
  const style = { width: size, height: size, borderRadius: round ? "9999px" : 6 };
  if (src) {
    // Served from our own route; Next's optimiser adds nothing for local uploads.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className="shrink-0 object-cover" />;
  }
  const initials = entity.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.max(10, size * 0.38), background: "color-mix(in srgb, var(--c) 22%, var(--surface))" }}
      className={`t-${entity.type} inline-flex shrink-0 items-center justify-center font-semibold text-[var(--c)]`}
    >
      {initials}
    </span>
  );
}

export function TypeChip({ type, children }: { type: EntityKind; children?: React.ReactNode }) {
  return (
    <span
      className={`t-${type} inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--c)]`}
      style={{ background: "color-mix(in srgb, var(--c) 13%, transparent)" }}
    >
      {children ?? TYPE_LABEL[type]}
    </span>
  );
}

/** Compact clickable row used in rails, lists and pickers. */
export function EntityRow({
  entity,
  portrait,
  active,
  compact,
  onClick,
  onHover,
}: {
  entity: EntityView;
  portrait: string | null;
  active?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={`t-${entity.type} flex w-full items-center gap-2.5 rounded-lg border-l-[3px] px-2 py-1.5 text-left hover:border-[var(--c)] hover:bg-surface ${
        active ? "border-[var(--c)] bg-surface" : "border-transparent"
      }`}
    >
      <Portrait entity={entity} src={portrait} size={compact ? 30 : 44} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{entity.name}</span>
        {entity.label && <span className="block truncate text-[11px] uppercase tracking-wide text-muted">{entity.label}</span>}
      </span>
    </button>
  );
}

/** Searchable list of every bible entry. */
export function EntityPicker({
  views,
  portraitFor,
  onPick,
  onClose,
  initialQuery = "",
  only,
}: {
  views: EntityView[];
  portraitFor: (key: string) => string | null;
  onPick: (entity: EntityView) => void;
  onClose: () => void;
  initialQuery?: string;
  only?: string[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return views
      .filter((v) => !only || only.includes(v.key))
      .filter((v) => !q || [v.name, ...v.aliases].some((n) => n.toLowerCase().includes(q)))
      .slice(0, 12);
  }, [views, query, only]);

  return (
    <div ref={ref} className="w-72 rounded-xl border border-line bg-surface p-1.5 shadow-soft" role="dialog" aria-label="Choose an entity">
      <label className="mb-1 flex items-center gap-2 border-b border-line px-2 pb-1.5">
        <Search size={14} className="text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a character, place, event…"
          className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted"
        />
      </label>
      <div className="max-h-72 overflow-y-auto">
        {results.length === 0 && <p className="px-2 py-3 text-sm text-muted">No matches.</p>}
        {results.map((v) => (
          <button
            key={v.key}
            onClick={() => onPick(v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
          >
            <Portrait entity={v} src={portraitFor(v.key)} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm">{v.name}</span>
            <TypeChip type={v.type} />
          </button>
        ))}
      </div>
    </div>
  );
}
