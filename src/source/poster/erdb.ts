import { ContentType } from "@stremio-addon/sdk";
import { Prefix } from "../../lib/manifest.js";
import { axiosHead } from "../../utils/axios.js";
import { ENV } from "../../utils/env.js";

const baseUrl = "https://easyratingsdb.com";
export async function getErdbPoster(
  prefix: Prefix,
  id: string,
  type: ContentType,
  fallbackUrl: string,
) {
  const typeParam = type === "movie" ? "movie" : "tv";
  const style =
    "ratingStyle=glass&lang=en-US&posterAnimeImageText=default&posterRatings=imdb,tmdb,mdblist,tomatoes,anilist&posterStreamBadges=off&imageText=default&posterRatingsLayout=bottom";
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
