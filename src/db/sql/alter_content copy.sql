BEGIN TRANSACTION;

PRAGMA foreign_keys = OFF;

-- Step 1: Note existing schema (manual or query)
CREATE TABLE streams (
	`id` real PRIMARY KEY,
	`provider_content_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text,
	`episode` text,
	`url` text NOT NULL,
	`playlist` text,
	`resolution` text,
	`created_at` integer NOT NULL,
	`ttl` integer,
	FOREIGN KEY (`provider_content_id`) REFERENCES `provider_content`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "content_check_1" CHECK(type IN ('movie', 'series'),
	CONSTRAINT "provider_content_check_2" CHECK(type IN ('movie', 'series')
);

INSERT INTO
  content_temp (
    id,
    title,
    alt_title,
    overview,
    year,
    type,
    imdb_id,
    tmdb_id,
    tvdb_id,
    poster,
    background,
    logo,
    genres,
    created_at,
    updated_at,
    ttl
  )
SELECT
  id,
  title,
  alt_title,
  overview,
  year,
  type,
  imdb_id,
  tmdb_id,
  tvdb_id,
  null,
  null,
  logo,
  genres,
  created_at,
  updated_at,
  ttl
FROM
  content;

-- NULL auto-increments
DROP TABLE content;

ALTER TABLE content_temp
RENAME TO content;

-- Recreate any indexes/views/triggers here
PRAGMA foreign_key_check;

PRAGMA foreign_keys = ON;

COMMIT;