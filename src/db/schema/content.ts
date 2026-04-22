import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const content = sqliteTable(
  "content",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    altTitle: text("alt_title"),
    overview: text("overview"),
    year: integer("year").notNull(),
    type: text("type", {
      enum: ["movie", "series", "channel", "tv"],
    }).notNull(),
    imdbId: text("imdb_id"),
    tmdbId: text("tmdb_id"),
    tvdbId: text("tvdb_id"),
    poster: text("poster"),
    background: text("background"),
    logo: text("logo"),
    genres: text("genres"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at"),
    ttl: integer("ttl"),
  },
  (table) => [
    index("idx_content_imdb").on(table.imdbId, table.type),
    index("idx_content_tmdb").on(table.tmdbId, table.type),
    index("idx_content_tvdb").on(table.tvdbId, table.type),
  ],
);

export type EContent = typeof content.$inferSelect;
export type EContentInsert = typeof content.$inferInsert;
