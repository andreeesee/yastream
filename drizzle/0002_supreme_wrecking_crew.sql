PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content` (
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
	`updated_at` integer,
	`ttl` integer
);
--> statement-breakpoint
INSERT INTO `__new_content`("id", "title", "alt_title", "overview", "year", "type", "imdb_id", "tmdb_id", "tvdb_id", "poster", "background", "logo", "genres", "created_at", "updated_at", "ttl") SELECT "id", "title", "alt_title", "overview", "year", "type", "imdb_id", "tmdb_id", "tvdb_id", "poster", "background", "logo", "genres", "created_at", "updated_at", "ttl" FROM `content`;--> statement-breakpoint
DROP TABLE `content`;--> statement-breakpoint
ALTER TABLE `__new_content` RENAME TO `content`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_content_imdb` ON `content` (`imdb_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_content_tmdb` ON `content` (`tmdb_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_content_tvdb` ON `content` (`tvdb_id`,`type`);--> statement-breakpoint
CREATE TABLE `__new_provider_content` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`year` integer NOT NULL,
	`type` text NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`ttl` integer,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_provider_content`("id", "content_id", "provider", "external_id", "title", "year", "type", "image", "created_at", "updated_at", "ttl") SELECT "id", "content_id", "provider", "external_id", "title", "year", "type", "image", "created_at", "updated_at", "ttl" FROM `provider_content`;--> statement-breakpoint
DROP TABLE `provider_content`;--> statement-breakpoint
ALTER TABLE `__new_provider_content` RENAME TO `provider_content`;--> statement-breakpoint
CREATE INDEX `idx_provider_content_external_id` ON `provider_content` (`provider`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_streams_url` ON `streams` (`url`);