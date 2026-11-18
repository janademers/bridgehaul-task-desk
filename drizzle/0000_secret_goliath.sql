CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
