"use client";

export type Variant = { name: string; description: string; checked: boolean };

export function VariantCard({
  variant,
  nameLabel,
  onChange,
}: {
  variant: Variant;
  nameLabel: string;
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
      <textarea
        className="w-full resize-none rounded-sm border border-ink-line bg-ink px-2 py-1.5 text-sm text-paper focus:border-fountain focus:outline-none"
        placeholder="Description"
        value={variant.description}
        onChange={(e) => onChange({ ...variant, description: e.target.value })}
        rows={3}
      />
    </div>
  );
}
