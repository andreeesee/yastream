import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { providerContent } from "./provider_content.js";
import { unique } from "drizzle-orm/sqlite-core/unique-constraint";

export const streams = sqliteTable(
  "streams",
  {
    id: text("id").primaryKey(),
    providerContentId: text("provider_content_id")
      .notNull()
      .references(() => providerContent.id),
    provider: text("provider").notNull(),
    externalId: text("external_id"),
    season: text("season"),
    episode: text("episode"),
    url: text("url").notNull(),
    playlist: text("playlist"),
    resolution: text("resolution"),
    createdAt: integer("created_at").notNull(),
    ttl: integer("ttl"),
  },
  (table) => [
    unique("uq_streams_url").on(table.url),
    index("idx_streams_provider_id").on(table.providerContentId),
  ],
);

export type EStream = typeof streams.$inferSelect;
export type EStreamInsert = typeof streams.$inferInsert;
