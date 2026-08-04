ALTER TABLE `stories` ADD `system_prompt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `temperature` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `extended_thinking` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `max_tokens` integer DEFAULT 4096 NOT NULL;