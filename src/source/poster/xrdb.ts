//https://xrdb.ibbylabs.dev/poster/tmdb:tv:1396.jpg?ratingStyle=glass&lang=en&posterRatings=imdb%2Ctmdb%2Ctomatoes%2Ctrakt%2Csimkl&posterStreamBadges=off&tmdbKey=5a80d61a3a3491a02c79279863a5d30c&imageText=clean&posterRatingsLayout=bottom

import { ContentType } from "@stremio-addon/sdk";
import { Prefix } from "../../lib/manifest.js";
import { axiosHead } from "../../utils/axios.js";
import { ENV } from "../../utils/env.js";

const baseUrl = "https://xrdb.ibbylabs.dev";
export async function getXrdbPoster(
  prefix: Prefix,
  id: string,
  type: ContentType,
  fallbackUrl: string,
) {
  const typeParam = type === "movie" ? "movie" : "tv";
  const style =
    "ratingStyle=glass&lang=en&posterRatings=imdb,tmdb,mdblist,tomatoes,anilist&posterStreamBadges=off&imageText=clean&posterRatingsLayout=bottom";
  const key = ENV.TMDB_KEY;
  let url = fallbackUrl;
  if (prefix === Prefix.IMDB) {
    url = `${baseUrl}/poster/${id}.jpg?&tmdbKey=${key}&${style}`;
  } else {
    url = `${baseUrl}/poster/${prefix}:${typeParam}:${id}.jpg?&tmdbKey=${key}&${style}`;
  }
  if (await axiosHead<boolean>(url)) return url;
  return fallbackUrl;
}
