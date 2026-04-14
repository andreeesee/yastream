import { ContentType } from "@stremio-addon/sdk";
import { Prefix, UserConfig } from "../../lib/manifest.js";
import { getRpdbPoster } from "./rpdb.js";
import { getErdbPoster } from "./erdb.js";
import { getXrdbPoster } from "./xrdb.js";

export interface PosterParam {
  prefix: Prefix;
  id: string;
  type: ContentType;
  fallbackUrl: string;
}
export async function getPosterUrl(param: PosterParam, config: UserConfig) {
  switch (config.poster) {
    case "rpdb":
      return await getRpdbPoster(
        param.prefix,
        param.id,
        param.type,
        param.fallbackUrl,
      );
    case "erdb":
      return await getErdbPoster(
        param.prefix,
        param.id,
        param.type,
        param.fallbackUrl,
      );
    case "xrdb":
      return await getXrdbPoster(
        param.prefix,
        param.id,
        param.type,
        param.fallbackUrl,
      );
    default:
      return param.fallbackUrl;
  }
}
