import fs from "fs";
import http from "http";
import path from "path";
import stremioPkg from "stremio-addon-sdk";
import addonInterface from "./lib/addon.js";
import { envGet } from "./lib/env.js";
const { getRouter } = stremioPkg;
import pkg from "../package.json" with { type: "json" };

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

  const url = req.url?.split("?")[0] || "";

  try {
    // Handle addon routes (manifest.json, stream/*, etc.)
    if (
      url === "/manifest.json" ||
      url.startsWith("/stream/") ||
      url.startsWith("/catalog/") ||
      url.startsWith("/subtitles/")
    ) {
      return addonRouter(req, res, () => {
        // If the SDK somehow falls through, we end it here to prevent headers error
        if (!res.writableEnded) {
          res.writeHead(404);
          res.end();
        }
      });
    }

    // Serve custom landing page at root
    if (req.url === "/" || req.url === "/index.html") {
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

server.listen(PORT, HOST, () => {
  console.log(`[SERVER] yastream running on http://${HOST}:${PORT}`);
  console.log(`[SERVER] Landing page: http://${HOST}:${PORT}/`);
  console.log(`[SERVER] Manifest: http://${HOST}:${PORT}/manifest.json`);
});

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
