import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { providerContent } from "./provider_content.js";
export const subtitles = sqliteTable(
  "subtitles",
  {
    id: text("id").primaryKey(),
    providerContentId: text("provider_content_id")
      .notNull()
      .references(() => providerContent.id),
    season: text("season"),
    episode: text("episode"),
    url: text("url").notNull(),
    lang: text("lang").notNull(),
    subtitle: text("subtitle"),
    createdAt: integer("created_at").notNull(),
    ttl: integer("ttl"),
  },
  (table) => [
    unique("uq_subtitles_url").on(table.url),
    unique("uq_subtitles_provider_season_episode_lang").on(
      table.providerContentId,
      table.season,
      table.episode,
      table.lang,
    ),
    index("idx_subtitles_provider_id").on(table.providerContentId),
  ],
);

export type ESubtitle = typeof subtitles.$inferSelect;
export type ESubtitleInsert = typeof subtitles.$inferInsert;
