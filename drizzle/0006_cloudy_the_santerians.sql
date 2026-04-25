ALTER TABLE `streams` ADD `hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_streams_hash` ON `streams` (`hash`);