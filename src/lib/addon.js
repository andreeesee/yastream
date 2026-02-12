const { addonBuilder } = require("stremio-addon-sdk");
const KissKHScraperr = require("../source/kisskh");
const TMDBService = require("../source/tmdb");

const manifest = require("./manifest");
const builder = new addonBuilder(manifest);

const scraper = new KissKHScraperr();
const tmdb = new TMDBService();

builder.defineStreamHandler(async ({ type, id }) => {
  if (!id || !id.startsWith("tt")) {
    return { streams: [] };
  }

  const [imdbId, season, episode] = id.split(":");
  season
    ? console.log(
        `[ADDON] imdbId: ${imdbId}, season: ${season}, episode: ${episode}`,
      )
    : console.log("[ADDON] imdbId:", imdbId);

  try {
    // First get content details from TMDB using IMDB ID
    const contentDetails = await tmdb.getContentDetails(imdbId, type);

    if (!contentDetails) {
      console.log(`[ADDON] No TMDB found ${imdbId}`);
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

    return {
      streams: streams?.map((stream) => ({
        name: stream.name || "AsiaView",
        title: `${stream.description || "Stream from KissKH"} - ${contentDetails.title}`,
        url: stream.url,
        behaviorHints: {
          notWebReady: true,
        },
        subtitles: [],
      })),
    };
  } catch (error) {
    console.error("Stream handler error:", error);
    return { streams: [] };
  }
});

module.exports = builder.getInterface();
