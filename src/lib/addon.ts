import { addonBuilder, AddonInterface, ContentType } from "stremio-addon-sdk";
import KissKHScraperr from "../source/kisskh.js";
import TMDBService from "../source/tmdb.js";

import { cache } from "../utils/cache.js";
import { Logger } from "../utils/logger.js";
import manifest from "./manifest.js";
const builder = new addonBuilder(manifest);

const scraper = new KissKHScraperr();
const tmdb = new TMDBService();
const logger = new Logger("ADDON");

builder.defineSubtitlesHandler(
  async (args: {
    type: ContentType;
    id: string;
    extra: {
      videoHash: string;
      videoSize: string;
    };
  }) => {
    const noSubtitles = { subtitles: [] };
    if (!args.id || !args.id.startsWith("tt")) {
      return noSubtitles;
    }

    const [imdbId, season, episode] = args.id.split(":");
    season
      ? logger.log(
          `Subtitle | imdbId: ${imdbId}, season: ${season}, episode: ${episode}`,
        )
      : logger.log(`Get | id: ${args.id}`);
    if (!imdbId) {
      return noSubtitles;
    }

    // First get content details from TMDB using IMDB ID
    const contentType = args.type === "series" ? "series" : "movie";
    const contentKey = `content:${imdbId}`;
    const cacheContents = cache.get(contentKey);
    let content;
    if (cacheContents != null) {
      content = cacheContents;
    } else {
      content = await tmdb.getContentDetails(imdbId, contentType);
      cache.set(contentKey, content, 24 * 60 * 60 * 1000); // ttl 24h
    }

    if (!content) {
      logger.log(`No TMDB found ${imdbId}`);
      return noSubtitles;
    }

    const title = content.title;
    const type = content.type;
    const year = content.year;
    const subtitleKey = `subtitles:${title}:${type}:${year}:${season}:${episode}`;
    const subtitles = cache.get(subtitleKey);
    return { subtitles: subtitles || [] };
  },
);

builder.defineStreamHandler(async (args: { type: ContentType; id: string }) => {
  logger.log(`Stream | ${args.id}`);
  if (!args.id || !args.id.startsWith("tt")) {
    return { streams: [] };
  }

  const [imdbId, season, episode] = args.id.split(":");
  if (!imdbId) {
    return { streams: [] };
  }
  try {
    // First get content details from TMDB using IMDB ID
    const contentType = args.type === "series" ? "series" : "movie";
    const contentKey = `content:${imdbId}`;
    const cacheContents = cache.get(contentKey);
    let content;
    if (cacheContents != null) {
      content = cacheContents;
    } else {
      content = await tmdb.getContentDetails(imdbId, contentType);
      cache.set(contentKey, content, 24 * 60 * 60 * 1000); // ttl 24h
    }

    if (!content) {
      logger.log(`No TMDB found ${imdbId}`);
      return { streams: [] };
    }

    // Search for streams using the TMDB title
    const streams = await scraper.getStreams(
      content.title,
      content.type,
      content.year,
      season ? parseInt(season) : null,
      episode ? parseInt(episode) : null,
    );

    return { streams: streams || [] };
  } catch (error) {
    logger.error(`Stream handler error: ${error}`);
    return { streams: [] };
  }
});

export default builder.getInterface() as AddonInterface;
