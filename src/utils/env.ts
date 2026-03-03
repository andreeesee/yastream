import { z } from "zod";
const envSchema = z.object({
  // REQUIRED
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
  TVDB_API_KEY: z.string().min(1, "TVDB_API_KEY is required"),

  // OPTIONAL with Defaults
  DISPLAY_NAME: z.string().default("yastream"),
  DOMAIN: z.string().default("localhost"),
  PORT: z.coerce.number().default(55913),

  // Optional key
  RPDB_API_KEY: z.string().default("t0-free-rpdb"),
  DEBUG_KEY: z.string().default("debug-key"),

  // Logging: Uses an enum to restrict values
  LOG_LEVEL: z
    .enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "NONE"])
    .default("INFO"),

  // Infrastructure
  CACHE_SIZE_MB: z.coerce.number().default(100),

  // Mediaflow (Optional - can be empty strings)
  MEDIAFLOW_PROXY_URL: z.url().or(z.literal("")).optional(),
  MEDIAFLOW_PROXY_PASSWORD: z.string().optional().default(""),

  // Analytics: Coerces "1"/"0" or "true"/"false" to boolean
  ENABLE_ANALYTICS: z.coerce.boolean(),
});

// Validate process.env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Invalid .env`, z.treeifyError(parsed.error).properties);
  process.exit(1);
}

export const ENV = parsed.data;
