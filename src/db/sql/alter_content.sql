BEGIN TRANSACTION;

PRAGMA foreign_keys = OFF;

-- Step 1: Note existing schema (manual or query)
CREATE TABLE
  IF NOT EXISTS content_temp (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    alt_title TEXT,
    overview TEXT,
    year INTEGER,
    type TEXT NOT NULL CHECK (type IN ('movie', 'series')),
    imdb_id TEXT,
    tmdb_id TEXT,
    tvdb_id TEXT,
    poster TEXT,
    background TEXT,
    logo TEXT,
    genres TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ttl INTEGER,
    UNIQUE (imdb_id, type),
    UNIQUE (tmdb_id, type),
    UNIQUE (tvdb_id, type)
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