import { Hono } from "hono";
import { cache } from "../../utils/cache.js";
import { ENV } from "../../utils/env.js";

// Monitor cache
const dashboard = new Hono();
dashboard.get("/", async (c) => {
  const DEBUG_KEY = ENV.DEBUG_KEY;
  const userKey = c.req.query("key");

  if (userKey !== DEBUG_KEY) {
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

export default dashboard;
