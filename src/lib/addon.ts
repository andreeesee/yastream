import {
  addonBuilder,
  AddonInterface,
  Args,
  ContentType,
  MetaPreview,
  Stream,
} from "stremio-addon-sdk";
import KissKHScraper from "../source/kisskh.js";
import TMDBService, { ContentDetail } from "../source/tmdb.js";

import { IDramaScraper } from "../source/idrama.js";
import { BaseProvider } from "../source/provider.js";
import { cache } from "../utils/cache.js";
import { Logger } from "../utils/logger.js";
import manifest from "./manifest.js";
const builder = new addonBuilder(manifest);

const kisskh = new KissKHScraper("KISSKH");
const idrama = new IDramaScraper("IDRAMA");
const providers: BaseProvider[] = [kisskh];
const tmdb = new TMDBService();
const logger = new Logger("ADDON");

async function initContent(args: {
  id: string;
  type: ContentType;
}): Promise<ContentDetail | null> {
  const [imdbId, season, episode] = args.id.split(":");
  if (!imdbId) {
    return null;
  }

  // get content details from TMDB using IMDB ID (tt000000)
  const contentType = args.type === "series" ? "series" : "movie";
  const contentKey = `content:${imdbId}`;
  const cacheContents = cache.get(contentKey);
  let content: ContentDetail | null;
  if (cacheContents != null) {
    content = cacheContents;
  } else {
    content = await tmdb.getContentDetails(imdbId, contentType);
    cache.set(contentKey, content, 24 * 60 * 60 * 1000); // ttl 24h
  }

  if (!content) {
    logger.log(`No TMDB found ${imdbId}`);
    return null;
  }

  content.season = season ? parseInt(season) : null;
  content.episode = episode ? parseInt(episode) : null;
  return content;
}

// builder.defineCatalogHandler(async (args) => {
//   try {
//     logger.log(`Catalog | ${args.id}`);
//     // const content = await initContent(args);
//     // if (content == null) {
//     //   return { metas: [] };
//     // }

//     let url = "https://www.idramahd.com/";

//     // Change URL based on catalog ID (if you have specific category pages)
//     if (args.id === "IDRAMA") {
//       url = "https://www.idramahd.com/category/movies/";
//     }

//     const scrapedItems = await idrama.getItems(url);

//     // Convert scraped items into Stremio Meta objects
//     const metas = scrapedItems.map((item) => {
//       const meta: MetaPreview = {
//         id: `IDRAMA_${Buffer.from(item.url).toString("base64")}`, // Unique ID based on URL
//         type: args.type, // 'movie' or 'series'
//         name: item.title,
//         poster: item.poster,
//         posterShape: "regular",
//         background: item.poster, // Use same image for background
//         logo: item.logo,
//         description: item.description,
//       };
//       // logger.log(`Item | ${JSON.stringify(item)}`);
//       return meta;
//     });

//     return { metas: [] };
//   } catch (error) {
//     logger.error(`Subtitles handler error: ${error}`);
//     return { metas: [] };
//   }
// });

builder.defineSubtitlesHandler(async (args) => {
  try {
    const content = await initContent(args);
    if (content == null) {
      return { subtitles: [] };
    }
    const title = content.title;
    const type = content.type;
    const year = content.year;
    const season = content.season;
    const episode = content.episode;
    const subtitleKey = `subtitles:${title}:${type}:${year}:${season}:${episode}`;
    const subtitles = cache.get(subtitleKey);
    return { subtitles: subtitles || [] };
  } catch (error) {
    logger.error(`Subtitles handler error: ${error}`);
    return { subtitles: [] };
  }
});

builder.defineStreamHandler(async (args) => {
  try {
    const content = await initContent(args);
    if (!content) {
      return { streams: [] };
    }
    // Search for streams using the TMDB title
    const streams: Stream[] = [];
    for (const provider of providers) {
      const providerStreams = await provider.getStreams(
        content.title,
        content.type,
        content.year,
        content.season,
        content.episode,
      );
      if (providerStreams) {
        streams.push(...providerStreams);
      }
    }
    return { streams: streams };
  } catch (error) {
    logger.error(`Streams handler error: ${error}`);
    return { streams: [] };
  }
});

export default builder.getInterface() as AddonInterface;
