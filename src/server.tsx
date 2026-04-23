import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import {
  AddonBuilder,
  createRouter,
  MetaDetail,
  MetaPreview,
  ShortManifestResource,
  Stream,
  Subtitle,
} from "@stremio-addon/sdk";
import axios from "axios";
import fs from "fs";
import { Context, Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { cors } from "hono/cors";
import path from "path";
import pkg from "../package.json" with { type: "json" };
import {
  buildCatalogHandler,
  buildMetaHandler,
  buildStreamHandler,
  buildSubtitleHandler,
} from "./lib/addon.js";
import { buildManifest, defaultConfig, UserConfig } from "./lib/manifest.js";
import { initMigrations } from "./db/drizzle.js";
import { Provider } from "./source/provider.js";
import { cache } from "./utils/cache.js";
import { getOrgin } from "./utils/domain.js";
import { ENV } from "./utils/env.js";
import { Logger } from "./utils/logger.js";
import { getSetDecryptedSubtitle } from "./source/kisskh-subtitle.js";
import { umami } from "./utils/analytic/umami.js";

initMigrations();

const HOST = "0.0.0.0";
const PORT = ENV.PORT;
const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const app = new Hono();
const logger = new Logger("SERVER");

// CORS middleware
app.use("*", cors());

// Umami Tracking for specific paths
if (ENV.ENABLE_ANALYTICS) {
  app.on(
    "GET",
    [
      "/:configBase64/catalog/*",
      "/:configBase64/meta/*",
      "/:configBase64/stream/*",
      "/:configBase64/subtitles/*",
      "/catalog/*",
      "/meta/*",
      "/stream/*",
      "/subtitles/*",
    ],
    async (c, next) => {
      const ip =
        c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip");
      const country = c.req.header("cf-ipcountry");
      const origin = c.req.header("origin") || c.req.header("referer");
      const userAgent = c.req.header("user-agent");
      umami?.track({
        url: c.req.url,
        ip: ip,
        country: country,
        origin: origin,
        userAgent: userAgent,
      });
      await next();
    },
  );
}

const getLimiter = (
  resource: ShortManifestResource,
  windowMs: number = 30 * 60 * 1000,
  limit: number = 30,
) => {
  const getDescription = (remaining: number) => {
    const description = "Too Many Request\nRetry after";
    getRetryAfterText(remaining);
    return `${description} ${getRetryAfterText(remaining)}`;
  };
  const getRetryAfterText = (remaining: number) => {
    if (remaining < 60) {
      return `${remaining} seconds`;
    } else {
      const minutes = Math.ceil(remaining / 60);
      return `${minutes} minutes`;
    }
  };
  const getName = () => `⏱️${ENV.DISPLAY_NAME}\nRate Limit`;
  const limiter = (resource: ShortManifestResource) => {
    return rateLimiter({
      windowMs: windowMs,
      limit: limit,
      keyGenerator: (c) => {
        const ip =
          c.req.header("x-forwarded-for") ||
          c.req.header("cf-connecting-ip") ||
          "anonymous";
        const userAgent = c.req.header("user-agent")?.slice(0, 50) || "";
        const key = `${ip}:${userAgent}`;
        return key;
      },
      handler: (c) => {
        const ip =
          c.req.header("x-forwarded-for") ||
          c.req.header("cf-connecting-ip") ||
          "anonymous";
        const remaining = c.res.headers.get("RateLimit-Reset") ?? "5";
        const description = getDescription(parseInt(remaining));
        logger.error(
          `Rate limit | Resource: ${resource}, IP: ${ip}, Wait: ${remaining}s`,
        );
        if (ENV.NTFY_URL) {
          axios.post(
            ENV.NTFY_URL,
            `
            **Yastream Rate Limit**
            - resource: ${resource}
            - ip: ${ip}
            - wait: ${getRetryAfterText(parseInt(remaining))}
            - request: ${c.req.path}
            `,
            { headers: { Markdown: "yes" } },
          );
        }
        umami?.send(
          {
            website: ENV.UMAMI_WEBSITE_ID,
            name: "ratelimit",
            data: {
              resource: resource,
              ip: ip,
              wait: getRetryAfterText(parseInt(remaining)),
              request: c.req.path,
            },
          },
          "event",
        );
        let limitResponse = {};
        switch (resource) {
          case "catalog":
            const catalogLimit: { metas: MetaPreview[] } = {
              metas: [
                {
                  id: "catalog.ratelimit",
                  type: "series",
                  name: getName(),
                  description: description,
                },
              ],
            };
            limitResponse = catalogLimit;
            break;
          case "meta":
            const metaLimit: { meta: MetaDetail } = {
              meta: {
                id: "meta.ratelimit",
                type: "series",
                name: getName(),
                description: description,
              },
            };
            limitResponse = metaLimit;
            break;
          case "stream":
            const streamsLimit: { streams: Stream[] } = {
              streams: [
                {
                  name: getName(),
                  description: description,
                  externalUrl: getOrgin(),
                },
              ],
            };
            limitResponse = streamsLimit;
            break;
          case "subtitles":
            const subtitlesLimit: { subtitles: Subtitle[] } = {
              subtitles: [
                {
                  label: description,
                  id: "subtitles.ratelimit",
                  url: getOrgin(),
                  lang: "eng",
                },
              ],
            };
            limitResponse = subtitlesLimit;
            break;
          default:
            limitResponse = { description: description };
            break;
        }
        return c.json({ ...limitResponse, retryAfter: remaining }, 200);
      },
    });
  };
  return limiter(resource);
};
const catalogLimiter = getLimiter(
  "catalog",
  ENV.CATALOG_WINDOW_MINUTES * 60 * 1000,
  ENV.CATALOG_REQUEST_LIMIT,
);
const metaLimiter = getLimiter(
  "meta",
  ENV.META_WINDOW_MINUTES * 60 * 1000,
  ENV.META_REQUEST_LIMIT,
);
const streamLimiter = getLimiter(
  "stream",
  ENV.STREAM_WINDOW_MINUTES * 60 * 1000,
  ENV.STREAM_REQUEST_LIMIT,
);
const subtitlesLimiter = getLimiter(
  "subtitles",
  ENV.SUBTITLES_WINDOW_MINUTES * 60 * 1000,
  ENV.SUBTITLES_REQUEST_LIMIT,
);

// Handle config routes
app.get("/manifest.json", (c) => {
  const manifest = buildManifest();
  return c.json(manifest);
});
app.get("/:configBase64/manifest.json", (c) => {
  const configBase64 = c.req.param("configBase64");
  const config = decodeConfig(configBase64);
  const manifest = buildManifest(config);
  return c.json(manifest);
});

// Stremio addon routes handler
interface RouteConfig {
  route: string;
  limiter: ReturnType<typeof rateLimiter>;
}
const stremioRoutes: RouteConfig[] = [
  { route: "/catalog/*", limiter: catalogLimiter },
  { route: "/meta/*", limiter: metaLimiter },
  { route: "/stream/*", limiter: streamLimiter },
  { route: "/subtitles/*", limiter: subtitlesLimiter },
];
stremioRoutes.forEach((route) => {
  app.use(route.route, route.limiter);
  app.get(route.route, async (c: Context) => {
    const defaultManifest = buildManifest();
    const builder = new AddonBuilder(defaultManifest);
    builder.defineCatalogHandler(async (args) => {
      return await buildCatalogHandler(args);
    });
    builder.defineMetaHandler(async (args) => {
      return await buildMetaHandler(args);
    });
    builder.defineStreamHandler(async (args) => {
      return await buildStreamHandler(args);
    });
    builder.defineSubtitlesHandler(async (args) => {
      return await buildSubtitleHandler(args);
    });
    const addonRouter = createRouter(builder.getInterface());
    const response = await addonRouter(c.req.raw);
    if (response) {
      c.header(
        "Cache-Control",
        response.headers.get("Cache-Control") || "no-cache",
      );
    }
    return response || c.notFound();
  });
});

const decodeConfig = (configBase64: string): UserConfig => {
  try {
    const decoded = Buffer.from(configBase64, "base64").toString("utf-8");
    logger.debug(`Config | ${decoded}`);
    const config: UserConfig = JSON.parse(decoded);
    // TODO clean up when migrate all user
    config.catalog = config.catalog.map((id) => id.toLowerCase() as Provider);
    config.stream = config.stream.map((id) => id.toLowerCase() as Provider);
    return config;
  } catch (error) {
    logger.error(`Fail parse config | ${error}`);
    return defaultConfig;
  }
};

const configStremioRoutes: RouteConfig[] = [
  { route: "/:configBase64/catalog/*", limiter: catalogLimiter },
  { route: "/:configBase64/meta/*", limiter: metaLimiter },
  { route: "/:configBase64/stream/*", limiter: streamLimiter },
  { route: "/:configBase64/subtitles/*", limiter: subtitlesLimiter },
];
configStremioRoutes.forEach((route) => {
  app.use(route.route, route.limiter);
  app.get(route.route, async (c: Context) => {
    const configBase64 = c.req.param("configBase64") as string;
    const config = decodeConfig(configBase64);
    const manifest = buildManifest(config);
    const builder = new AddonBuilder(manifest);
    if (manifest.resources.includes("catalog")) {
      builder.defineCatalogHandler(async (args) => {
        return await buildCatalogHandler(args, config);
      });
    }
    if (
      manifest.resources.includes("meta") ||
      manifest.resources.some(
        (r) => typeof r === "object" && "name" in r && r.name === "meta",
      )
    ) {
      builder.defineMetaHandler(async (args) => {
        return await buildMetaHandler(args, config);
      });
    }
    if (manifest.resources.includes("stream")) {
      builder.defineStreamHandler(async (args) => {
        return await buildStreamHandler(args, config);
      });
    }
    if (manifest.resources.includes("subtitles")) {
      builder.defineSubtitlesHandler(async (args) => {
        return await buildSubtitleHandler(args, config);
      });
    }
    const customRouter = createRouter(builder.getInterface());
    const response = await customRouter(c.req.raw);
    if (response) {
      c.header(
        "Cache-Control",
        response.headers.get("Cache-Control") || "no-cache",
      );
    }
    return response || c.notFound();
  });
});

// Serve decrypted subtitles
app.get("/subtitle/:url{.*}", async (c) => {
  const encodedUrl = c.req.param("url");

  try {
    const decryptedSubtitle = await getSetDecryptedSubtitle(encodedUrl);
    if (decryptedSubtitle) {
      return c.text(decryptedSubtitle, 200, {
        "Content-Type": "text/vtt",
        "Access-Control-Allow-Origin": "*",
      });
    } else {
      logger.error(`Missing decrypted subtitle | ${encodedUrl}`);
      return c.text("Subtitle not found or decryption failed", 404);
    }
  } catch (error) {
    logger.error(`Fail decrypted subtitle | ${error}`);
    return c.text("Invalid subtitle URL", 400);
  }
});

// Serve custom landing page at root
let cachedLandingHtml: string | null = null;
const getLandingPage = () => {
  if (cachedLandingHtml) return cachedLandingHtml;
  const filePath = path.join(publicDir, "landing.html");
  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  if (!fs.existsSync(filePath)) return null;
  const changelog = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf-8")
    : "";
  cachedLandingHtml = fs
    .readFileSync(filePath, "utf8")
    .replace("{{VERSION}}", pkg.version)
    .replace("{{CHANGELOG}}", mdToHtml(changelog));

  return cachedLandingHtml;
};

app.on("GET", ["/", "/configure", "/:configBase64/configure"], (c) => {
  const html = getLandingPage();
  return html ? c.html(html) : c.notFound();
});

function mdToHtml(md: string) {
  return md
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^## (.*$)/gim, "<h3>$1</h3>")
    .replace(/^# (.*$)/gim, "<h2>$1</h2>")
    .replace(/(\d+\.\s+.*)$/gm, "<ol>$1</ol>")
    .replace(/^\* (.*$)/gim, "<li>$1</li>")
    .replace(/^\- (.*$)/gim, "<li>$1</li>")
    .replace(/\*\*(.*)\*\*/gim, "<b>$1</b>");
}

// Public static file
app.use(
  "/*",
  serveStatic({
    root: "./public",
  }),
);

// Monitor cache
app.get("/dashboard", async (c) => {
  const SECRET_KEY = ENV.DEBUG_KEY;
  const userKey = c.req.query("key");

  if (userKey !== SECRET_KEY) {
    return c.text("Unauthorized", 403);
  }

  // Check if user wants to clear the cache
  if (c.req.query("clear") !== undefined) {
    cache.clearAll();
    return c.text("Cache cleared successfully", 200);
  }

  const data = cache.getDebugData();

  return c.html(
    <html>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        ></meta>
        <title>yastream Cache Debug</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * {color: var(--foreground)}
          body { --foreground: #fff1e3;font-family: sans-serif; padding: 20px; background: #393939; color: var(--foreground); }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 12px; text-align: left; }
          th { background: #1e1e1e; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; }
          .card { background: #1e1e1e; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
          .btn-clear { background: #ff4444; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        `,
          }}
        />
      </head>
      <body>
        <h1>yastream Cache Dashboard</h1>
        <div class="stats">
          <div class="card">
            <h3>Items</h3>
            <p>{data.itemCount}</p>
          </div>
          <div class="card">
            <h3>Memory</h3>
            <p>
              {data.memoryUsed} / {data.maxLimit} MB
            </p>
          </div>
          <div class="card">
            <h3>Usage</h3>
            <p>{data.usagePercent}%</p>
          </div>
        </div>
        <a
          href={`/dashboard?key=${userKey}&clear=true`}
          class="btn-clear"
          onclick="return confirm('Really clear all cache?')"
        >
          Clear All Cache
        </a>
        <table>
          <thead>
            <tr>
              <th style={"border-radius: 5px;"}>Key</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((k) => (
              <tr>
                <td>{k.key}</td>
                <td>{JSON.stringify(k.value)}</td>
                <td>{JSON.stringify(k.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </body>
    </html>,
  );
});

// Error handling
app.onError((err, c) => {
  logger.error(`${err}`);
  return c.text("Internal Server Error", 500);
});

async function warmCache() {
  const defaultCatalogUrls = buildManifest()
    .catalogs.filter((catalog) => {
      return !catalog.id.toLowerCase().includes("search");
    })
    .map((catalog) => `/catalog/${catalog.type}/${catalog.id}.json`);
  const warmUrls = ["/manifest.json", ...defaultCatalogUrls];
  await Promise.all(
    warmUrls.map((url) => {
      fetch("http://localhost:" + PORT + url);
    }),
  );
}
// Start server
try {
  serve({ fetch: app.fetch, port: PORT, hostname: HOST }, () => {
    logger.log(`yastream running on http://${HOST}:${PORT}`);
  });
  if (ENV.WARM_CACHE) {
    await warmCache();
    logger.log(`Warming cache completed`);
  }
} catch (error) {
  logger.log(`Fail to start | ${error}`);
}

// Global catch to prevent crashes
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`CRASH PREVENTED | Promise: ${promise}, Reason: ${reason}`);
});
process.on("uncaughtException", (err) => {
  logger.error(`CRASH PREVENTED ${err}`);
});

umami?.send({ website: ENV.UMAMI_WEBSITE_ID, name: "check-init" }, "identify");
