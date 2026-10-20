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
    <div className="rounded-md border border-line bg-surface p-3">
      <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
        <input
          type="checkbox"
          checked={variant.checked}
          onChange={(e) => onChange({ ...variant, checked: e.target.checked })}
        />
        Keep this
      </label>
      <input
        className="mb-2 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
        placeholder={nameLabel}
        value={variant.name}
        onChange={(e) => onChange({ ...variant, name: e.target.value })}
      />
      {fields.map((f) => (
        <textarea
          key={f.key}
          className="mb-2 w-full resize-none rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-fg focus:border-accent focus:outline-none last:mb-0"
          placeholder={f.label}
          value={variant.values[f.key] ?? ""}
          onChange={(e) => onChange({ ...variant, values: { ...variant.values, [f.key]: e.target.value } })}
          rows={3}
        />
      ))}
    </div>
  );
}
