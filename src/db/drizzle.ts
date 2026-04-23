import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { Logger } from "../utils/logger.js";
import { content } from "./schema/content.js";
import { kv } from "./schema/kv.js";
import { providerContent } from "./schema/provider_content.js";
import { streams } from "./schema/streams.js";
import { subtitles } from "./schema/subtitles.js";
import * as sqlite from "./sqlite.js";

const logger = new Logger("DB");

export const db = sqlite.db
  ? drizzle(sqlite.db.getDb(), {
      schema: {
        content,
        providerContent,
        streams,
        subtitles,
        kv,
      },
    })
  : null;

export function initMigrations() {
  try {
    if (db) migrate(db, { migrationsFolder: "drizzle" });
  } catch (err) {
    logger.log(`Migration skipped: ${err}`);
  }
}
