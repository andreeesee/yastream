DROP INDEX `idx_content_imdb`;--> statement-breakpoint
DROP INDEX `idx_content_tmdb`;--> statement-breakpoint
DROP INDEX `idx_content_tvdb`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_content_imdb` ON `content` (`imdb_id`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_content_tmdb` ON `content` (`tmdb_id`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_content_tvdb` ON `content` (`tvdb_id`,`type`);--> statement-breakpoint
DROP INDEX `idx_kv_key`;--> statement-breakpoint
CREATE INDEX `idx_kv_expires_at` ON `kv` (`expires_at`);