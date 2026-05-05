CREATE TABLE IF NOT EXISTS `developers` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'developer' NOT NULL,
	`api_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `developers_username_unique` ON `developers` (`username`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `developers_email_unique` ON `developers` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `developers_api_key_unique` ON `developers` (`api_key`);
