import { drizzle } from "drizzle-orm/better-sqlite3";
import { content } from "./schema/content.js";
import { kv } from "./schema/kv.js";
import { providerContent } from "./schema/provider_content.js";
import { streams } from "./schema/streams.js";
import { subtitles } from "./schema/subtitles.js";
import * as sqlite from "./sqlite.js";

export const db = drizzle(sqlite.db.getDb(), {
  schema: {
    content,
    providerContent,
    streams,
    subtitles,
    kv,
  },
});
