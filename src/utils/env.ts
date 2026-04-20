import { z } from "zod";
const envSchema = z.object({
  // REQUIRED
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
  TVDB_API_KEY: z.string().min(1, "TVDB_API_KEY is required"),

  // OPTIONAL with Defaults
  DISPLAY_NAME: z.string().default("yastream"),
  // Mediaflow (Optional - can be empty strings)
  MEDIAFLOW_PROXY_URL: z.url().or(z.literal("")).optional(),
  MEDIAFLOW_PROXY_PASSWORD: z.string().optional().default(""),
  // Min title matching score (higher mean only very similar title matches)
  MIN_MATCHING_SCORE: z.coerce.number().min(0).max(100).default(75),

  // Optional key
  RPDB_API_KEY: z.string().default("t0-free-rpdb"),
  TMDB_KEY: z.string().default(""),
  DEBUG_KEY: z.string().default("debug-key"),

  // Server configuration
  DOMAIN: z.string().default("localhost"),
  PORT: z.coerce.number().default(55913),
  CACHE_SIZE_MB: z.coerce.number().default(100),
  // Retry configuration
  RETRY_ATTEMPTS: z.coerce.number().default(8),
  RETRY_DELAY_MS: z.coerce.number().default(2500),
  RETRY_JITTER_MS: z.coerce.number().default(500),
  LOG_LEVEL: z
    .enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "NONE"])
    .default("INFO"),
  // Analytics: Coerces "1"/"0" or "true"/"false" to boolean
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  // Cache warming
  WARM_CACHE: z.coerce.boolean().default(true),

  // Kisskh domains
  KISSKH_URLS: z
    .string()
    .transform((str) => JSON.parse(str))
    .pipe(z.array(z.url()))
    .default(["https://kisskh.co", "https://kisskh.do"]),
});

// Validate process.env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Invalid .env`, z.treeifyError(parsed.error).properties);
  process.exit(1);
}

export const ENV = parsed.data;
