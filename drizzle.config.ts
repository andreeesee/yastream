import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "data/yastream.db",
  },
} satisfies Config;