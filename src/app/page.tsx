"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

type Story = { id: number; title: string; premise: string };

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");

  useEffect(() => {
    fetch("/api/stories")
      .then((r) => r.json())
      .then(setStories);
  }, []);

  async function createStory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, premise }),
    });
    if (res.ok) {
      const created = await res.json();
      setStories((prev) => [created, ...prev]);
      setTitle("");
      setPremise("");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <section className="mb-16">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-carbon">
          A blank page
        </p>
        <h1 className="mb-8 max-w-xl font-display text-4xl leading-[1.1] font-medium text-paper sm:text-5xl">
          Begin a new story.
        </h1>
        <form onSubmit={createStory} className="max-w-xl space-y-4">
          <input
            className="w-full border-b border-ink-line bg-transparent pb-3 font-display text-2xl text-paper placeholder:text-ink-faint focus:border-fountain focus:outline-none"
            placeholder="Working title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="min-h-20 w-full resize-none rounded-sm border border-ink-line bg-ink-wash p-3 text-base text-paper/90 placeholder:text-ink-faint focus:border-fountain focus:outline-none"
            placeholder="One or two sentences — what is this story about?"
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-sm bg-paper px-5 py-2.5 font-mono text-sm uppercase tracking-wide text-ink transition-colors hover:bg-paper-dim"
          >
            <Plus size={15} /> Open a new folder
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">
          On the shelf
        </h2>
        {stories.length === 0 ? (
          <p className="font-mono text-sm text-ink-faint">
            Nothing shelved yet — the folder above is where the first one starts.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stories.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stories/${s.id}`}
                  className="group block rounded-sm border border-ink-line bg-ink-wash p-5 transition-colors hover:border-fountain-dim"
                >
                  <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-sm bg-carbon/20 text-carbon">
                    <BookOpen size={13} />
                  </span>
                  <span className="block font-display text-xl text-paper group-hover:text-fountain">
                    {s.title}
                  </span>
                  {s.premise && (
                    <span className="mt-2 block text-sm text-paper/60">{s.premise}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
