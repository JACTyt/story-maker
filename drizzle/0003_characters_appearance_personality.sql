ALTER TABLE `characters` ADD `appearance` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `personality` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `characters` SET `personality` = `description`;--> statement-breakpoint
ALTER TABLE `characters` DROP COLUMN `description`;
