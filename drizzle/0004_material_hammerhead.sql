CREATE TABLE `prose_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`source` text DEFAULT 'generated' NOT NULL,
	`parent_version_id` integer,
	`label` text,
	`model` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `chapters` ADD `current_version_id` integer;