-- Migration: 0002 marketplace schema
CREATE TABLE IF NOT EXISTS `plugins` (
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

CREATE UNIQUE INDEX IF NOT EXISTS `plugins_slug_unique` ON `plugins` (`slug`);

CREATE TABLE IF NOT EXISTS `plugin_versions` (
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

CREATE TABLE IF NOT EXISTS `plugin_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` integer DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS `plugin_categories_name_unique` ON `plugin_categories` (`name`);
CREATE UNIQUE INDEX IF NOT EXISTS `plugin_categories_slug_unique` ON `plugin_categories` (`slug`);

CREATE TABLE IF NOT EXISTS `plugin_category_mappings` (
	`plugin_id` text NOT NULL,
	`category_id` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `plugin_categories`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_plugin_category_unique` ON `plugin_category_mappings` (`plugin_id`,`category_id`);
CREATE INDEX IF NOT EXISTS `idx_pcm_category` ON `plugin_category_mappings` (`category_id`);

CREATE TABLE IF NOT EXISTS `plugin_reviews` (
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

CREATE UNIQUE INDEX IF NOT EXISTS `developers_username_unique` ON `developers` (`username`);
CREATE UNIQUE INDEX IF NOT EXISTS `developers_email_unique` ON `developers` (`email`);
CREATE UNIQUE INDEX IF NOT EXISTS `developers_api_key_unique` ON `developers` (`api_key`);
