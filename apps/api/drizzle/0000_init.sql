CREATE TABLE `affirmations` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`text` text NOT NULL,
	`theme` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `affirmations_deck_idx` ON `affirmations` (`deck_id`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `target_type`, `target_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`karma` integer DEFAULT 40 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`theme` text NOT NULL,
	`description` text NOT NULL,
	`epigraph` text NOT NULL,
	`guide` text NOT NULL,
	`palette` text NOT NULL,
	`audio_minutes` integer NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decks_slug_unique` ON `decks` (`slug`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mood` text NOT NULL,
	`body` text NOT NULL,
	`ripple_action` text DEFAULT '' NOT NULL,
	`entry_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `journal_user_idx` ON `journal_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `mantras` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`attribution` text DEFAULT '' NOT NULL,
	`intent` text NOT NULL,
	`palette` text NOT NULL,
	`typography` text NOT NULL,
	`aura` text NOT NULL,
	`micro_action` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mantras_user_idx` ON `mantras` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `practices` (
	`user_id` text NOT NULL,
	`practice_date` text NOT NULL,
	`action_id` text NOT NULL,
	`karma` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `practice_date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ripple_lights` (
	`ripple_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`ripple_id`, `user_id`),
	FOREIGN KEY (`ripple_id`) REFERENCES `ripples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ripples` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`mantra_tag` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ripples_created_idx` ON `ripples` (`created_at`);--> statement-breakpoint
CREATE INDEX `ripples_user_idx` ON `ripples` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`csrf_token` text NOT NULL,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_sub` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`soundscape` text DEFAULT 'morning-mist' NOT NULL,
	`narration_rate` integer DEFAULT 90 NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_sub_unique` ON `users` (`google_sub`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);