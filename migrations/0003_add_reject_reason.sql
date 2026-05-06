-- Migration: 0003 add reject_reason column to plugins
ALTER TABLE `plugins` ADD COLUMN `reject_reason` text;
