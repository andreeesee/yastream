PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`alt_title` text,
	`overview` text,
	`year` integer NOT NULL,
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
CREATE INDEX `idx_content_tvdb` ON `content` (`tvdb_id`,`type`);