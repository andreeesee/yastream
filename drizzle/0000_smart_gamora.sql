CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`alt_title` text,
	`overview` text,
	`year` integer,
	`type` text NOT NULL,
	`imdb_id` text,
	`tmdb_id` text,
	`tvdb_id` text,
	`poster` text,
	`background` text,
	`logo` text,
	`genres` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ttl` integer
);
--> statement-breakpoint
CREATE INDEX `idx_content_imdb` ON `content` (`imdb_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_content_tmdb` ON `content` (`tmdb_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_content_tvdb` ON `content` (`tvdb_id`,`type`);--> statement-breakpoint
CREATE TABLE `provider_content` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`year` integer NOT NULL,
	`type` text NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ttl` integer,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_provider_content_external_id` ON `provider_content` (`provider`,`external_id`);--> statement-breakpoint
CREATE TABLE `streams` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_content_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text,
	`season` text,
	`episode` text,
	`url` text NOT NULL,
	`playlist` text,
	`resolution` text,
	`created_at` integer NOT NULL,
	`ttl` integer,
	FOREIGN KEY (`provider_content_id`) REFERENCES `provider_content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_streams_provider_id` ON `streams` (`provider_content_id`);--> statement-breakpoint
CREATE TABLE `subtitles` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_content_id` text NOT NULL,
	`season` text,
	`episode` text,
	`url` text NOT NULL,
	`lang` text NOT NULL,
	`subtitle` text,
	`created_at` integer NOT NULL,
	`ttl` integer,
	FOREIGN KEY (`provider_content_id`) REFERENCES `provider_content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_subtitles_provider_id` ON `subtitles` (`provider_content_id`);