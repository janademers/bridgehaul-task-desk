ALTER TABLE `staff` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `deactivated_at` text;