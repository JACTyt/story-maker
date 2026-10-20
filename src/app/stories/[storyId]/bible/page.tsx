"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BibleList, GROUPS } from "@/components/BibleList";
import { EntityEditor, type EntityTarget } from "@/components/EntityEditor";
import { TYPE_LABEL } from "@/components/EntityBits";
import { useBible } from "@/lib/bibleClient";
import type { EntityKind } from "@/lib/mentions";

const isKind = (v: unknown): v is EntityKind => GROUPS.some((g) => g.type === v);

export default function BiblePage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { storyId } = use(params);
  const query = use(searchParams);
  const router = useRouter();
  const bible = useBible(storyId);
  const tab = isKind(query.tab) ? query.tab : null;
  const [target, setTarget] = useState<EntityTarget | null>(typeof query.open === "string" ? { key: query.open } : null);

  const setTab = (next: EntityKind | null) => router.replace(`/stories/${storyId}/bible${next ? `?tab=${next}` : ""}`, { scroll: false });

  return (
    <div className="flex h-screen flex-col">
      <AppHeader>
        <span className="text-muted">/</span>
        <Link href={`/stories/${storyId}`} className="text-sm text-muted hover:text-fg">
          Story
        </Link>
        <span className="text-muted">/</span>
        <span className="text-sm font-medium">Story bible</span>
      </AppHeader>
      <div className="flex gap-1 border-b border-line bg-surface px-5" role="tablist">
        {[null, ...GROUPS.map((g) => g.type)].map((t) => (
          <button
            key={t ?? "all"}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm ${tab === t ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t ? GROUPS.find((g) => g.type === t)!.label : "All"}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-line p-4">
          <BibleList
            storyId={storyId}
            bible={bible}
            only={tab ?? undefined}
            activeKey={target && "key" in target ? target.key : null}
            onOpen={(key) => setTarget({ key })}
            onCreate={(type) => setTarget({ create: type, name: "" })}
          />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl p-8">
            {bible.error && <p className="text-sm text-danger">{bible.error}</p>}
            {target ? (
              <>
                {"create" in target && (
                  <p className="mb-4 text-sm text-muted">New {TYPE_LABEL[target.create].toLowerCase()} — give it a name, then fill in what you know or let the AI propose the rest.</p>
                )}
                <EntityEditor
                  storyId={storyId}
                  bible={bible}
                  target={target}
                  onSaved={(key) => setTarget({ key })}
                  onDeleted={() => setTarget(null)}
                  onOpenEntity={(key) => setTarget({ key })}
                />
              </>
            ) : (
              <div className="py-24 text-center text-muted">
                <p className="text-lg">Everything your story knows.</p>
                <p className="mt-1 text-sm">Pick an entry on the left, or add a new one.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
