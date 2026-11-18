CREATE TABLE `reminder_config` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminder_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`claim` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `staff` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `teams_chat_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `teams_label` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `email_reminders` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `teams_reminders` integer DEFAULT 1 NOT NULL;