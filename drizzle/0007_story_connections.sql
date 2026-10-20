CREATE TABLE `character_relationships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`story_id` integer NOT NULL,
	`from_character_id` integer NOT NULL,
	`to_character_id` integer NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `timeline_event_chapters` (
	`event_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	PRIMARY KEY(`event_id`, `chapter_id`),
	FOREIGN KEY (`event_id`) REFERENCES `timeline_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `timeline_event_characters` (
	`event_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	PRIMARY KEY(`event_id`, `character_id`),
	FOREIGN KEY (`event_id`) REFERENCES `timeline_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `aliases` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `role` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `backstory` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `goals` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `images` ADD `is_primary` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `aliases` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `kind` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `parent_place_id` integer REFERENCES places(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `timeline_events` ADD `aliases` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `timeline_events` ADD `place_id` integer REFERENCES places(id) ON DELETE SET NULL;--> statement-breakpoint
UPDATE `images` SET `is_primary` = 1 WHERE `id` IN (
	SELECT MIN(`id`) FROM `images` i
	WHERE i.`sort_order` = (SELECT MIN(`sort_order`) FROM `images` j WHERE j.`entity_type` = i.`entity_type` AND j.`entity_id` = i.`entity_id`)
	GROUP BY `entity_type`, `entity_id`
);
