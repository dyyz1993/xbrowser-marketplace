CREATE TABLE `plugin_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_categories_name_unique` ON `plugin_categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_categories_slug_unique` ON `plugin_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `plugin_category_mappings` (
	`plugin_id` text NOT NULL,
	`category_id` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `plugin_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_plugin_category_unique` ON `plugin_category_mappings` (`plugin_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `idx_pcm_category` ON `plugin_category_mappings` (`category_id`);--> statement-breakpoint
CREATE TABLE `plugin_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`content` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plugin_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`version` text NOT NULL,
	`changelog` text,
	`package_url` text,
	`file_size` integer,
	`checksum` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`published_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`readme` text,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`repository_url` text,
	`homepage_url` text,
	`npm_package` text,
	`license` text DEFAULT 'MIT',
	`version` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`download_count` integer DEFAULT 0,
	`view_count` integer DEFAULT 0,
	`featured` integer DEFAULT false,
	`screenshot_url` text,
	`site_urls` text,
	`tags` text,
	`commands` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugins_slug_unique` ON `plugins` (`slug`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_todo_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`todo_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`path` text NOT NULL,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`todo_id`) REFERENCES `todos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_todo_attachments`("id", "todo_id", "file_name", "original_name", "mime_type", "size", "path", "uploaded_by", "created_at") SELECT "id", "todo_id", "file_name", "original_name", "mime_type", "size", "path", "uploaded_by", "created_at" FROM `todo_attachments`;--> statement-breakpoint
DROP TABLE `todo_attachments`;--> statement-breakpoint
ALTER TABLE `__new_todo_attachments` RENAME TO `todo_attachments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;