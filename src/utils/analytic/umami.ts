import { Umami } from "@umami/node";
import { ENV } from "../env.js";

const umami = ENV.ENABLE_ANALYTICS ? new Umami() : null;
umami?.init({
  websiteId: ENV.UMAMI_WEBSITE_ID,
  hostUrl: ENV.UMAMI_URL,
});

export { umami };
