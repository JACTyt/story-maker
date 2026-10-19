-- Prose written before versioning existed lives only in chapters.generated_prose.
-- Promote each one to version 1 so no existing draft sits outside the history.
-- content_hash is left empty here because SQLite has no hash function; the
-- application dedupes on content, so an empty hash costs nothing.
INSERT INTO prose_versions (chapter_id, content, content_hash, source, parent_version_id, created_at)
SELECT id, generated_prose, '', 'imported', NULL, CAST(strftime('%s', 'now') AS INTEGER)
FROM chapters
WHERE generated_prose IS NOT NULL
  AND generated_prose <> ''
  AND current_version_id IS NULL;
--> statement-breakpoint
UPDATE chapters
SET current_version_id = (
  SELECT id FROM prose_versions
  WHERE prose_versions.chapter_id = chapters.id
  ORDER BY id DESC LIMIT 1
)
WHERE current_version_id IS NULL
  AND generated_prose IS NOT NULL
  AND generated_prose <> '';
