import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { content } from "./schema/content.js";
import { kv } from "./schema/kv.js";
import { providerContent } from "./schema/provider_content.js";
import { streams } from "./schema/streams.js";
import { subtitles } from "./schema/subtitles.js";
import { Logger } from "../utils/logger.js";
import * as sqlite from "./sqlite.js";

const logger = new Logger("DB");

export const db = drizzle(sqlite.db.getDb(), {
  schema: {
    content,
    providerContent,
    streams,
    subtitles,
    kv,
  },
});

export function initMigrations() {
  try {
    migrate(db, {
      migrationsFolder: "drizzle",
    });
  } catch (err) {
    logger.log(`Migration skipped: ${err}`);
  }
}