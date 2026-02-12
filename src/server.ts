import fs from "fs";
import http from "http";
import path from "path";
import pkg from "stremio-addon-sdk";
import addonInterface from "./lib/addon.js";
import { envGet } from "./lib/env.js";
const { getRouter } = pkg;

const HOST = "0.0.0.0";
const PORT = Number(envGet("PORT")) || 55913;

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");

// Create the addon router
const addonRouter = getRouter(addonInterface);

// Create custom server
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

  try {
    // Serve custom landing page at root
    if (req.url === "/" || req.url === "/index.html") {
      const filePath = path.join(publicDir, "landing.html");
      if (fs.existsSync(filePath)) {
        const html = fs.readFileSync(filePath, "utf8");
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
      !req.url.startsWith("/stream")
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

    // Handle addon routes (manifest.json, stream/*, etc.)
    let handledByAddon = false;
    addonRouter(req, res, () => {
      handledByAddon = false;
    });
    if (res.writableEnded || res.headersSent) {
      return;
    }

    // 404 for anything else
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  } catch (error) {
    console.error("[SERVER] error:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `[SERVER] yastream addon server running on http://${HOST}:${PORT}`,
  );
  console.log(`[SERVER] Custom landing page: http://${HOST}:${PORT}/`);
  console.log(`[SERVER] Manifest: http://${HOST}:${PORT}/manifest.json`);
});

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
