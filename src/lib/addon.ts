import { addonBuilder, AddonInterface, ContentType } from "stremio-addon-sdk";
import KissKHScraperr from "../source/kisskh.js";
import TMDBService from "../source/tmdb.js";

import manifest from "./manifest.js";
const builder = new addonBuilder(manifest);

const scraper = new KissKHScraperr();
const tmdb = new TMDBService();

builder.defineSubtitlesHandler(
  async (args: {
    type: ContentType;
    id: string;
    extra: {
      videoHash: string;
      videoSize: string;
    };
  }) => {
    return { subtitles: [] };
  },
);

builder.defineStreamHandler(async (args: { type: ContentType; id: string }) => {
  if (!args.id || !args.id.startsWith("tt")) {
    return { streams: [] };
  }

  const [imdbId, season, episode] = args.id.split(":");
  if (!imdbId) {
    return { streams: [] };
  }
  season
    ? console.log(
        `[ADDON ] Get | imdbId: ${imdbId}, season: ${season}, episode: ${episode}`,
      )
    : console.log("[ADDON ] Get | id:", args.id);

  try {
    // First get content details from TMDB using IMDB ID
    const contentType = args.type === "series" ? "series" : "movie";
    const contentDetails = await tmdb.getContentDetails(imdbId, contentType);

    if (!contentDetails) {
      console.log(`[ADDON ] No TMDB found ${imdbId}`);
      return { streams: [] };
    }

    // Search for streams using the TMDB title
    const streams = await scraper.getStreams(
      contentDetails.title,
      contentDetails.type,
      contentDetails.year,
      season ? parseInt(season) : null,
      episode ? parseInt(episode) : null,
    );

    return { streams: streams || [] };
  } catch (error) {
    console.error("Stream handler error:", error);
    return { streams: [] };
  }
});

export default builder.getInterface() as AddonInterface;
