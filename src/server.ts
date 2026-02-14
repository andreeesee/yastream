import { Umami } from "@umami/node";
import fs from "fs";
import http from "http";
import path from "path";
import stremioPkg from "stremio-addon-sdk";
import pkg from "../package.json" with { type: "json" };
import addonInterface from "./lib/addon.js";
import { cache } from "./utils/cache.js";
import { envGet } from "./utils/env.js";
import { getDecryptedSubtitle } from "./utils/subtitle.js";
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

const addonRouter = getRouter(addonInterface);

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url?.split("?")[0] || "";

  try {
    // Handle addon routes (manifest.json, stream/*, etc.)
    const isStreamAndSubtitleUrl =
      url.startsWith("/stream/") || url.startsWith("/subtitles/");
    if (
      url === "/manifest.json" ||
      url.startsWith("/catalog/") ||
      isStreamAndSubtitleUrl
    ) {
      if (isStreamAndSubtitleUrl) {
        umami.track({
          url: url,
          title: `Addon Request: ${url.split("/")[1] || "Home"}`,
          referrer: req.headers["user-agent"] || "Stremio",
        });
      }
      return addonRouter(req, res, () => {
        // If the SDK somehow falls through, we end it here to prevent headers error
        if (!res.writableEnded) {
          res.writeHead(404);
          res.end();
        }
      });
    }

    // Serve decrypted subtitles
    if (url.startsWith("/subtitle/")) {
      const encodedUrl = req.url?.replace("/subtitle/", "");
      try {
        const decryptedSubtitle = await getDecryptedSubtitle(encodedUrl!);
        if (decryptedSubtitle) {
          res.writeHead(200, {
            "Content-Type": "text/vtt",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(decryptedSubtitle);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Subtitle not found or decryption failed");
        }
      } catch (error) {
        console.error("[SERVER] Error serving subtitle:", error);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid subtitle URL");
      }
      return;
    }

    // Serve custom landing page at root
    if (req.url === "/") {
      const filePath = path.join(publicDir, "landing.html");
      if (fs.existsSync(filePath)) {
        const html = fs
          .readFileSync(filePath, "utf8")
          .replace("{{VERSION}}", pkg.version);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        return;
      }
    }

    // Serve CSS files
    if (req.url?.endsWith(".css")) {
      const filePath = path.join(publicDir, req.url);
      if (fs.existsSync(filePath)) {
        const css = fs.readFileSync(filePath, "utf8");
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(css);
        return;
      }
    }

    // Serve other static files
    if (
      req.url &&
      req.url !== "/" &&
      !req.url.startsWith("/manifest.json") &&
      !req.url.startsWith("/stream") &&
      !req.url.startsWith("/subtitles")
    ) {
      const filePath = path.join(publicDir, req.url);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        const contentType =
          {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            ".js": "application/javascript",
            ".json": "application/json",
          }[ext] || "application/octet-stream";

        res.writeHead(200, { "Content-Type": contentType });
        res.end(fileContent);
        return;
      }
    }

    // Monitor cache
    if (url === "/debug/cache") {
      const SECRET_KEY = envGet("DEBUG_KEY");
      const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
      const userKey = parsedUrl.searchParams.get("key");

      if (userKey !== SECRET_KEY) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        return;
      }

      // Check if user wants to clear the cache
      if (parsedUrl.searchParams.has("clear")) {
        cache.clearAll();
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Cache cleared successfully");
        return;
      }

      const data = cache.getDebugData();

      // Generate a simple HTML table for better readability
      const html = `
        <html>
            <head>
                <title>yastream Cache Debug</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; background: #121212; color: white; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #333; padding: 12px; text-align: left; }
                    th { background: #1e1e1e; }
                    .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                    .card { background: #1e1e1e; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
                    .btn-clear { background: #ff4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>yastream Cache Dashboard</h1>
                <div class="stats">
                    <div class="card"><h3>Items</h3><p>${data.itemCount}</p></div>
                    <div class="card"><h3>Memory</h3><p>${data.memoryUsed} / ${data.maxLimit} MB</p></div>
                    <div class="card"><h3>Usage</h3><p>${data.usagePercent}%</p></div>
                </div>
                <a href="/debug/cache?key=${userKey}&clear=true" class="btn-clear" onclick="return confirm('Really clear all cache?')">Clear All Cache</a>
                <table>
                    <thead><tr><th>Key</th></tr></thead>
                    <tbody>${data.keys.map((k) => `<tr><td>${k}</td></tr>`).join("")}</tbody>
                </table>
            </body>
        </html>
    `;

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    if (!res.writableEnded) {
      res.writeHead(404);
      res.end("Not Found");
    }
  } catch (error) {
    console.error("[SERVER] error:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

try {
  server.listen(PORT, HOST, () => {
    console.log(`[SERVER] yastream running on http://${HOST}:${PORT}`);
    console.log(`[SERVER] Manifest: http://${HOST}:${PORT}/manifest.json`);
  });
} catch (error) {
  console.log(`[SERVER] Fail to start | ${error}`);
}
