import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { chapters, proseVersions } from "./schema";

export type ProseVersionSource = "generated" | "edited" | "imported" | "reverted";

export type ProseVersion = typeof proseVersions.$inferSelect;

type RecordInput = {
  content: string;
  source: ProseVersionSource;
  model?: string;
  label?: string;
};

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * `generated_prose` is kept as a mirror of the live version rather than being
 * retired: every existing reader (chapter GET, export, compile) still uses it,
 * and only this module writes it, so the two cannot drift.
 */
function pointChapterAt(chapterId: number, version: ProseVersion): void {
  db.update(chapters)
    .set({
      currentVersionId: version.id,
      generatedProse: version.content,
      status: "generated",
      updatedAt: new Date(),
    })
    .where(eq(chapters.id, chapterId))
    .run();
}

function currentVersion(chapterId: number): ProseVersion | undefined {
  const chapter = db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
  if (!chapter?.currentVersionId) return undefined;
  return db.select().from(proseVersions).where(eq(proseVersions.id, chapter.currentVersionId)).get();
}

/**
 * Appends a version and points the chapter at it.
 *
 * Regenerating identical prose is common — the same prompt against a low
 * temperature — so content-identical consecutive versions collapse into one
 * rather than filling the history with indistinguishable entries.
 */
export function recordProseVersion(chapterId: number, input: RecordInput): ProseVersion {
  const existing = currentVersion(chapterId);
  // Compared by content, not hash: prose backfilled from before versioning
  // existed carries an empty hash, and it should still dedupe correctly.
  if (existing && existing.content === input.content) return existing;
  const contentHash = hash(input.content);

  const created = db
    .insert(proseVersions)
    .values({
      chapterId,
      content: input.content,
      contentHash,
      source: input.source,
      parentVersionId: existing?.id ?? null,
      model: input.model ?? null,
      label: input.label ?? null,
    })
    .returning()
    .get();

  pointChapterAt(chapterId, created);

  return created;
}

/** Newest first, so the history panel reads top-down. */
export function listProseVersions(chapterId: number): ProseVersion[] {
  return db
    .select()
    .from(proseVersions)
    .where(eq(proseVersions.chapterId, chapterId))
    .orderBy(desc(proseVersions.id))
    .all();
}

export function currentProse(chapterId: number): string {
  return currentVersion(chapterId)?.content ?? "";
}

/**
 * Restores older prose by appending a copy of it. The history is append-only:
 * reverting must never be able to destroy the version being left behind.
 */
export function revertToProseVersion(chapterId: number, versionId: number): ProseVersion {
  const target = db
    .select()
    .from(proseVersions)
    .where(and(eq(proseVersions.id, versionId), eq(proseVersions.chapterId, chapterId)))
    .get();
  if (!target) throw new Error(`version ${versionId} does not belong to chapter ${chapterId}`);

  const existing = currentVersion(chapterId);
  const created = db
    .insert(proseVersions)
    .values({
      chapterId,
      content: target.content,
      contentHash: target.contentHash,
      source: "reverted",
      parentVersionId: existing?.id ?? null,
      model: target.model,
      label: target.label,
    })
    .returning()
    .get();

  pointChapterAt(chapterId, created);

  return created;
}

/**
 * Autosave path: keeps the live prose current while the writer types, without
 * turning every pause into a history entry. A real version is cut later
 * (save, leaving the chapter, or after enough time), from whatever is live then.
 */
export function saveDraftProse(chapterId: number, content: string): void {
  db.update(chapters).set({ generatedProse: content, updatedAt: new Date() }).where(eq(chapters.id, chapterId)).run();
}
