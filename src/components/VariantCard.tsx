"use client";

export type Variant = { name: string; checked: boolean; values: Record<string, string> };

export function VariantCard({
  variant,
  nameLabel,
  fields,
  onChange,
}: {
  variant: Variant;
  nameLabel: string;
  fields: { key: string; label: string }[];
  onChange: (next: Variant) => void;
}) {
  return (
    <div className="rounded-sm border border-ink-line bg-ink-wash p-3">
      <label className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
        <input
          type="checkbox"
          checked={variant.checked}
          onChange={(e) => onChange({ ...variant, checked: e.target.checked })}
        />
        Keep this
      </label>
      <input
        className="mb-2 w-full rounded-sm border border-ink-line bg-ink px-2 py-1.5 text-sm text-paper focus:border-fountain focus:outline-none"
        placeholder={nameLabel}
        value={variant.name}
        onChange={(e) => onChange({ ...variant, name: e.target.value })}
      />
      {fields.map((f) => (
        <textarea
          key={f.key}
          className="mb-2 w-full resize-none rounded-sm border border-ink-line bg-ink px-2 py-1.5 text-sm text-paper focus:border-fountain focus:outline-none last:mb-0"
          placeholder={f.label}
          value={variant.values[f.key] ?? ""}
          onChange={(e) => onChange({ ...variant, values: { ...variant.values, [f.key]: e.target.value } })}
          rows={3}
        />
      ))}
    </div>
  );
}
