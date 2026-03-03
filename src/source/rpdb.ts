import { ContentType } from "stremio-addon-sdk";
import { Prefix } from "../lib/manifest.js";
import { axiosHead } from "../utils/axios.js";
import { ENV } from "../utils/env.js";

const baseUrl = "https://api.ratingposterdb.com";
export async function getRpdbPoster(
  prefix: Prefix,
  id: string,
  type: ContentType,
  fallbackUrl: string,
) {
  const typeParam = type === "movie" ? "movie-" : "series-";
  const key = ENV.RPDB_API_KEY;
  let url = fallbackUrl;
  if (prefix === Prefix.IMDB) {
    url = `${baseUrl}/${key}/imdb/poster-default/${id}.jpg`;
  } else {
    url = `${baseUrl}/${key}/${prefix}/poster-default/${typeParam}${id}.jpg`;
  }
  if (await axiosHead<boolean>(url)) return url;
  return fallbackUrl;
}
