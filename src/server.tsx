import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Umami } from "@umami/node";
import fs from "fs";
import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import path from "path";
import stremioPkg, { addonBuilder } from "stremio-addon-sdk";
import pkg from "../package.json" with { type: "json" };
import addonInterface, {
  buildCatalogHandler,
  buildMetaHandler,
  buildStreamHandler,
  buildSubtitleHandler,
  defaultConfig,
} from "./lib/addon.js";
import { buildManifest, UserConfig } from "./lib/manifest.js";
import { cache } from "./utils/cache.js";
import { envGet } from "./utils/env.js";
import { Logger } from "./utils/logger.js";
import { getSetDecryptedSubtitle } from "./utils/subtitle.js";
const { getRouter } = stremioPkg;

const umami = new Umami();
umami.init({
  websiteId: "f4af25ed-caf9-4fe2-ae07-7f0d50f5a51c",
  hostUrl: "https://umami-fs.tamthai.de",
});
const HOST = "0.0.0.0";
const PORT = Number(envGet("PORT")) || 55913;
const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const app = new Hono();
const addonRouter = getRouter(addonInterface);
const logger = new Logger("SERVER");

// CORS middleware
app.use("*", cors());

// Stremio addon routes handler
const handleStremioRoute = async (c: Context) => {
  return new Promise<Response>((resolve) => {
    const req = c.env?.incoming;
    const res = c.env?.outgoing;
    addonRouter(req, res, () => {
      resolve(c.notFound());
    });
  });
};
const stremioRoutes = [
  "/stremio/*",
  "/catalog/*",
  "/meta/*",
  "/stream/*",
  "/subtitles/*",
];
stremioRoutes.forEach((route) => {
  app.get(route, handleStremioRoute);
});

const decodeConfig = (configBase64: string): UserConfig => {
  try {
    const decoded = Buffer.from(configBase64, "base64").toString("utf-8");
    logger.debug(`Decoded config ${decoded}`);
    return JSON.parse(decoded);
  } catch (error) {
    logger.error(`Fail parse config | ${error}`);
    return defaultConfig;
  }
};

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
const configStremioRoutes = [
  "/:configBase64/stremio/*",
  "/:configBase64/catalog/*",
  "/:configBase64/meta/*",
  "/:configBase64/stream/*",
  "/:configBase64/subtitles/*",
];
configStremioRoutes.forEach((route) => {
  app.get(route, async (c: Context) => {
    const configBase64 = c.req.param("configBase64");
    const config = decodeConfig(configBase64);
    const manifest = buildManifest(config);
    const builder = new addonBuilder(manifest);
    if (manifest.resources.includes("catalog")) {
      builder.defineCatalogHandler(async (args) => {
        return await buildCatalogHandler(args, config);
      });
    }
    if (manifest.resources.includes("meta")) {
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
    const customRouter = getRouter(builder.getInterface());
    return new Promise<Response>((resolve) => {
      const req = c.env?.incoming;
      const res = c.env?.outgoing;
      customRouter(req, res, () => {
        resolve(c.notFound());
      });
    });
  });
});

// Umami Tracking for specific paths
app.on(
  "GET",
  ["/stream/*", "/:config/stream/*", "/subtitles/*", "/:config/subtitles/*"],
  async (c, next) => {
    const url = c.req.url;
    umami.track({
      url,
      title: `Addon Request: ${url.split("/")[3] || "Home"}`,
    });
    await next();
  },
);

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
      return c.text("Subtitle not found or decryption failed", 404);
    }
  } catch (error) {
    logger.error(`Error serving subtitle | error`);
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
  const SECRET_KEY = envGet("DEBUG_KEY") || "debug-key";
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
          href={`/debug/cache?key=${userKey}&clear=true`}
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
            {data.keys.map((k) => (
              <tr>
                <td>{k}</td>
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
  logger.error(`Error | ${err}`);
  return c.text("Internal Server Error", 500);
});

// Start server
try {
  serve({ fetch: app.fetch, port: PORT, hostname: HOST }, () => {
    logger.log(`yastream running on http://${HOST}:${PORT}`);
  });
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
