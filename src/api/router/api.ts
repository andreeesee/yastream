import { Context, Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { umami } from "../../utils/analytic/umami.js";
import { STREAMS, SUBTITLES } from "../../utils/constant.js";
import { ENV } from "../../utils/env.js";
import { Logger } from "../../utils/logger.js";
import { streamApiHandler } from "../controller/streams-api.js";
import { subtitleApiHandler } from "../controller/subtitles-api.js";
import {
  getDescription,
  getIp,
  getRetryAfterText,
  getUserAgent,
  RouteConfig,
} from "./stremio.js";

interface ApiRouteConfig extends RouteConfig {
  handler: (c: Context) => Promise<Response>;
}

const api = new Hono();
const logger = new Logger("API");
const getLimiter = (
  resource: string,
  windowMs: number = 10 * 60 * 1000,
  limit: number = 0,
) => {
  return rateLimiter({
    windowMs: windowMs,
    limit: limit,
    keyGenerator: (c) => {
      const ip = getIp(c);
      const userAgent = getUserAgent(c);
      const key = `${ip}:${userAgent}`;
      return key;
    },
    handler: (c) => {
      const ip = getIp(c);
      const remaining = c.res.headers.get("RateLimit-Reset") ?? "5";
      const wait = getRetryAfterText(parseInt(remaining));
      logger.error(
        `Rate limit | Resource: ${resource}, IP: ${ip}, Wait: ${remaining}s`,
      );
      umami?.send(
        {
          website: ENV.UMAMI_WEBSITE_ID,
          name: "ratelimit",
          data: {
            resource: resource,
            ip: ip,
            wait: wait,
            request: c.req.path,
          },
        },
        "event",
      );
      return c.json({ message: `Too Many Requests, please wait ${wait}`, retryAfter: remaining }, 429);
    },
  });
};
const apiRouteConfigs: ApiRouteConfig[] = [
  {
    route: `/${STREAMS}/:id`,
    limiter: getLimiter(STREAMS),
    handler: streamApiHandler,
  },
  {
    route: `/${SUBTITLES}/:id`,
    limiter: getLimiter(SUBTITLES),
    handler: subtitleApiHandler,
  },
];
apiRouteConfigs.forEach((config) => {
  api.use(config.route, config.limiter);
  api.get(config.route, config.handler);
});

export default api;
