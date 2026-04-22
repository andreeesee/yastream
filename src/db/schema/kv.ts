import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const kv = sqliteTable(
  "kv",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    size: integer("size"),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("idx_kv_key").on(table.key)],
);

export type EKV = typeof kv.$inferSelect;
export type EKVInsert = typeof kv.$inferInsert;
