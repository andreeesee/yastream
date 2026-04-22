import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
  (table) => [index("idx_subtitles_provider_id").on(table.providerContentId)],
);

export type ESubtitle = typeof subtitles.$inferSelect;
export type ESubtitleInsert = typeof subtitles.$inferInsert;
