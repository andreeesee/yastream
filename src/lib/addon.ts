import {
  addonBuilder,
  AddonInterface,
  Args,
  Cache,
  ContentType,
  MetaDetail,
  MetaPreview,
  Stream,
  Subtitle,
} from "stremio-addon-sdk";
import KissKHScraper from "../source/kisskh.js";
import TMDBService from "../source/tmdb.js";

import { IDramaScraper } from "../source/idrama.js";
import { ContentDetail } from "../source/meta.js";
import { BaseProvider, Provider } from "../source/provider.js";
import TVDBService from "../source/tvdb.js";
import { cache } from "../utils/cache.js";
import { Logger } from "../utils/logger.js";
import { buildManifest, Prefix, UserConfig } from "./manifest.js";
interface BaseArgs {
  type: ContentType;
  id: string;
}

interface ExtendArgs extends BaseArgs {
  extra: {
    videoHash: string;
    videoSize: string;
  };
}

export const defaultConfig = {
  catalog: [Provider.KISSKH],
  stream: [Provider.KISSKH],
};

const kisskh = new KissKHScraper(Provider.KISSKH);
const idrama = new IDramaScraper(Provider.IDRAMA);
const providers: BaseProvider[] = [kisskh, idrama];
const tmdb = new TMDBService(Provider.TMDB);
const tvdb = new TVDBService(Provider.TVDB);
const logger = new Logger("ADDON");

async function getContent(args: BaseArgs): Promise<ContentDetail | null> {
  switch (true) {
    case args.id.startsWith(Prefix.IMDB): {
      // imdb | tt0000:season:episode
      const [imdbId, season, episode] = args.id.split(":");
      if (!imdbId) {
        return null;
      }
      const contentType = args.type === "series" ? "series" : "movie";
      const contentKey = `content:imdb:${imdbId}`;
      const cacheContent = cache.get(contentKey);
      let content = cacheContent;
      if (!content) {
        content = await tmdb.findDetailImdb(imdbId, contentType);
        if (content) cache.set(contentKey, content, 24 * 60 * 60 * 1000);
      }
      if (!content) {
        logger.log(`No TMDB found with IMDB ${imdbId}`);
        return null;
      }
      if (season) content.season = parseInt(season);
      if (episode) content.episode = parseInt(episode);
      return content;
    }
    case args.id.startsWith(Prefix.TMDB): {
      // tmdb | tmdb:movieId
      // tmdb | tmdb:seriesId:season:episode
      const [prefix, tmdbId, season, episode] = args.id.split(":");
      if (!tmdbId) {
        return null;
      }
      const contentType = args.type === "series" ? "series" : "movie";
      const contentKey = `content:tmdb:${tmdbId}`;
      const cacheContent = cache.get(contentKey);
      let content: ContentDetail | null = cacheContent;
      if (!content) {
        content = await tmdb.getDetailTmdb(tmdbId, contentType);
        if (content) cache.set(contentKey, content, 24 * 60 * 60 * 1000);
      }
      if (!content) {
        // TMDB get from TMDB must return
        logger.error(`Not found TMDB ${tmdbId}`);
        return null;
      }
      if (season) content.season = parseInt(season);
      if (episode) content.episode = parseInt(episode);
      return content;
    }
    case args.id.startsWith(Prefix.TVDB): {
      // tvdb | tvdb:movieId
      // tvdb | tvdb:seriesId:season:episode
      const [prefix, tvdbId, season, episode] = args.id.split(":");
      if (!tvdbId) {
        return null;
      }
      const contentType = args.type === "series" ? "series" : "movie";
      const contentKey = `content:tvdb:${tvdbId}`;
      const cacheContent = cache.get(contentKey);
      let content: ContentDetail | null = cacheContent;
      if (!content) {
        content = await tvdb.getDetailTvdb(tvdbId, contentType);
        if (content) cache.set(contentKey, content, 24 * 60 * 60 * 1000);
      }
      if (!content) {
        logger.error(`Not found TVDB ${tvdbId}`);
        return null;
      }
      if (season) content.season = parseInt(season);
      if (episode) content.episode = parseInt(episode);
      return content;
    }
    case args.id.startsWith(Prefix.IDRAMA): {
      // id | idrama:postId:season:episode
      const [prefix, id, season, episode] = args.id.split(":");
      const { title, year } = await idrama.getStreamDetail(id!);
      const content: ContentDetail = {
        id: id!,
        title: title,
        year: year,
        type: "series",
        season: season ? parseInt(season) : 1,
        episode: episode ? parseInt(episode) : 1,
      };
      return content;
    }
    case args.id.startsWith(Prefix.KISSKH): {
      // id | kisskh:episodeId:season:episode
      const [prefix, id, season, episode] = args.id.split(":");
      const { title, releaseDate } = await kisskh.getDetail(id!);
      const content: ContentDetail = {
        id: id!,
        title: title,
        year: new Date(releaseDate).getFullYear(),
        type: "series",
        season: season ? parseInt(season) : 1,
        episode: episode ? parseInt(episode) : 1,
      };
      return content;
    }
  }
  return null;
}

export async function buildCatalogHandler(
  args: Args,
  config: UserConfig = defaultConfig,
): Promise<{ metas: MetaPreview[] } & Cache> {
  // id | kisskh.movie.Korean
  // id | idrama
  logger.log(`Catalog | ${args.id}`);
  try {
    const catalogKey = `catalog:${args.id}:${args.type}:${args.extra.skip}:${args.extra.search}`;
    const cacheCatalog = cache.get(catalogKey);
    if (cacheCatalog) return cacheCatalog;
    let metas: MetaPreview[] = [];
    const filteredProviders = filterProvider(providers, args.id);
    const selectedProviders = getCatalogProvider(filteredProviders, config);
    for (const provider of selectedProviders) {
      const newMetas = args.extra.search
        ? await provider.searchCatalog(args.id, args.type, args.extra.search)
        : await provider.getCatalog(args.id, args.type, args.extra.skip);
      metas.push(...newMetas);
    }
    const metaPreviews = { metas: metas, cacheMaxAge: 4 * 60 * 60 };
    cache.set(catalogKey, metaPreviews, 4 * 60 * 60 * 1000);
    return metaPreviews;
  } catch (error) {
    logger.error(`Catalog handler error: ${error}`);
    return { metas: [] };
  }
}

export async function buildMetaHandler(
  args: BaseArgs,
  config: UserConfig = defaultConfig,
) {
  logger.log(`Meta | ${args.id}`);

  const metaKey = `meta:${args.id}:${args.type}`;
  const cacheMeta = cache.get(metaKey);
  if (cacheMeta) return cacheMeta;

  const defaultMeta: { meta: MetaDetail } = {
    meta: {
      id: args.id,
      type: args.type,
      name: "You should use AIOMetadata for this metadata, I think they are doing a better job than me :> Fix by order AIOMetadata to be higher than this addon",
    },
  };
  try {
    const content = await getContent(args);
    if (!content) return defaultMeta;

    const [prefix, id] = args.id.split(":");
    if (!id) {
      return defaultMeta;
    }
    const filteredProviders = filterProvider(providers, args.id);
    const selectedProviders = getCatalogProvider(filteredProviders, config);
    for (const provider of selectedProviders) {
      const meta = await provider.getMeta(content.id || id, args.type);
      if (meta) {
        const metaDetail = { meta: meta || defaultMeta.meta };
        cache.set(metaKey, metaDetail, 4 * 60 * 60 * 1000);
        return metaDetail;
      }
    }
    return defaultMeta;
  } catch (error) {
    logger.error(`Meta handler error: ${error}`);
    return defaultMeta;
  }
}

export async function buildStreamHandler(
  args: BaseArgs,
  config: UserConfig = defaultConfig,
) {
  logger.log(`Stream | ${args.id}`);
  try {
    const content = await getContent(args);
    if (!content) {
      return { streams: [] };
    }
    // Search for streams using the TMDB title
    const streams: Stream[] = [];
    const filteredProviders = filterProvider(providers, args.id);
    const selectedProviders = getStreamProvider(filteredProviders, config);
    for (const provider of selectedProviders) {
      const providerStreams = await provider.getStreams(
        content.title,
        content.type,
        content.year,
        content.season,
        content.episode,
        content.id,
        content.altTitle,
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
}

export async function buildSubtitleHandler(
  args: ExtendArgs,
  config: UserConfig = defaultConfig,
): Promise<{ subtitles: Subtitle[] }> {
  logger.log(`Subtitles | ${args.id}`);
  try {
    const content = await getContent(args);
    if (content == null) {
      return { subtitles: [] };
    }
    const title = content.title;
    const type = content.type;
    const year = content.year;
    const season = content.season;
    const episode = content.episode;
    const subtitles: Subtitle[] = [];
    const filteredProviders = filterProvider(providers, args.id);
    const selectedProviders = getStreamProvider(filteredProviders, config);
    for (const provider of selectedProviders) {
      const subtitleKey = `subtitles:${provider.name.toLowerCase()}:${type}:${content.id}:${season}:${episode}`;
      const cacheSubtitles = cache.get(subtitleKey);
      if (cacheSubtitles) return { subtitles: cacheSubtitles || [] };
      const providerSubtitles = await provider.getSubtitles(content);
      if (providerSubtitles) {
        subtitles.push(...providerSubtitles);
      }
    }
    return { subtitles: subtitles };
  } catch (error) {
    logger.error(`Subtitles handler error: ${error}`);
    return { subtitles: [] };
  }
}

function filterProvider(providers: BaseProvider[], id: string) {
  return providers.filter((provider) => {
    return provider.supportedPrefix.some((prefix) => {
      return id.startsWith(prefix);
    });
  });
}

function getStreamProvider(providers: BaseProvider[], config: UserConfig) {
  return providers.filter((provider) => {
    return config.stream.includes(provider.name);
  });
}

function getCatalogProvider(providers: BaseProvider[], config: UserConfig) {
  return providers.filter((provider) => {
    return config.catalog.includes(provider.name);
  });
}

// With default manifest
const builder = new addonBuilder(buildManifest());
builder.defineCatalogHandler(async (args) => {
  return await buildCatalogHandler(args);
});
builder.defineMetaHandler(async (args: BaseArgs) => {
  return await buildMetaHandler(args);
});
builder.defineStreamHandler(async (args: BaseArgs) => {
  return await buildStreamHandler(args);
});
builder.defineSubtitlesHandler(async (args) => {
  return await buildSubtitleHandler(args);
});

export default builder.getInterface() as AddonInterface;
