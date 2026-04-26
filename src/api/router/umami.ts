import { Hono } from "hono";
import { umami } from "../../utils/analytic/umami.js";
import { API, STREAMS, SUBTITLES } from "../../utils/constant.js";
import { ENV } from "../../utils/env.js";

// Umami Tracking for specific paths
const analytics = new Hono();
if (ENV.UMAMI_ENABLED) {
  analytics.on(
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
      `/${API}/${STREAMS}/*`,
      `/${API}/${SUBTITLES}/*`,
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

export default analytics;
