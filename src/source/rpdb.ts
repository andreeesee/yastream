import { ContentType } from "stremio-addon-sdk";
import { Prefix } from "../lib/manifest.js";
import { envGet } from "../utils/env.js";

const baseUrl = "https://api.ratingposterdb.com";
export function getRpdbPoster(prefix: Prefix, id: string, type: ContentType) {
  const typeParam = type === "movie" ? "movie-" : "series-";
  const key = envGet("RPDB_KEY") || "t0-free-rpdb";
  if (prefix === Prefix.IMDB) {
    return `${baseUrl}/${key}/imdb/poster-default/${id}?fallback=true`;
  } else {
    return `${baseUrl}/${key}/${prefix}/poster-default/${typeParam}${id}?fallback=true`;
  }
}
