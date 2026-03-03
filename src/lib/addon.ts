import {
  addonBuilder,
  AddonInterface,
  Args,
  Cache,
  ContentType,
  MetaDetail,
  MetaPreview,
  ShortManifestResource,
  Subtitle,
} from "stremio-addon-sdk";
import KissKHScraper from "../source/kisskh.js";
// import TMDBService from "../source/tmdb.js";

import { IDramaScraper } from "../source/idrama.js";
import { KkphimScraper } from "../source/kkphim.js";
import { ContentDetail } from "../source/meta.js";
import { OphimScraper } from "../source/ophim.js";
import { BaseProvider, Provider } from "../source/provider.js";
import { tmdb } from "../source/tmdb.js";
import { tvdb } from "../source/tvdb.js";
import { cache } from "../utils/cache.js";
import { Logger } from "../utils/logger.js";
import {
  buildManifest,
  defaultConfig,
  Prefix,
  UserConfig,
} from "./manifest.js";
import { extractTitleYear } from "../utils/fuse.js";
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

const kisskh = new KissKHScraper(Provider.KISSKH);
const idrama = new IDramaScraper(Provider.IDRAMA);
const kkphim = new KkphimScraper(Provider.KKPHIM);
const ophim = new OphimScraper(Provider.OPHIM);
const providers: BaseProvider[] = [kisskh, idrama, kkphim, ophim];
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
      const [prefix, idramaId, season, episode] = args.id.split(":");
      if (!idramaId) return null;
      const detail = await idrama.getStreamDetail(idramaId);
      if (!detail) return null;
      const { title, year } = detail;
      const content: ContentDetail = {
        id: idramaId,
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
      const [prefix, kisskhId, season, episode] = args.id.split(":");
      if (!kisskhId) return null;
      const { title, releaseDate } = await kisskh.getDetail(kisskhId);
      const extracted = extractTitleYear(title);
      const pureTitle = extracted.title;
      const content: ContentDetail = {
        id: kisskhId,
        title: pureTitle,
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
    const catalogKey = `catalog:${args.type}:${args.id}:${args.extra.skip}:${args.extra.search}:${config.nsfw}`;
    const cacheCatalog = cache.get(catalogKey);
    if (cacheCatalog) return cacheCatalog;
    const filteredProviders = filterProvider(
      providers,
      args.id,
      config,
      "catalog",
    );
    const metas = await Promise.all(
      filteredProviders.map((provider) => {
        if (args.extra.search) {
          return provider.searchCatalog(args, config);
        }
        return provider.getCatalog(args, config);
      }),
    );
    const metaPreviews = { metas: metas.flat(), cacheMaxAge: 4 * 60 * 60 };
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

  const metaKey = `meta:${args.type}:${args.id}`;
  const cacheMeta = cache.get(metaKey);
  if (cacheMeta) return cacheMeta;

  const defaultMeta: { meta: MetaDetail } = {
    meta: {
      id: args.id,
      type: args.type,
      name: "You should use AIOMetadata for this metadata, I think they are doing a better job than me. Fix by order AIOMetadata to be higher than this addon",
    },
  };
  try {
    const content = await getContent(args);
    if (!content) return defaultMeta;

    const [prefix, id] = args.id.split(":");
    if (!id) {
      return defaultMeta;
    }
    const notCustomPrefix = [Prefix.IMDB, Prefix.TMDB, Prefix.TVDB];
    for (const pref of notCustomPrefix) {
      if (id.startsWith(pref)) return defaultConfig;
    }
    const filteredProviders = filterProvider(
      providers,
      args.id,
      config,
      "meta",
    );
    for (const provider of filteredProviders) {
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
    const streamKey = `streams:${args.type}:${args.id}:${JSON.stringify(config.stream)}:${config.info}`;
    const cacheStreams = cache.get(streamKey);
    if (cacheStreams) return cacheStreams;
    const content = await getContent(args);
    if (!content) {
      return { streams: [] };
    }
    const filteredProviders = filterProvider(
      providers,
      args.id,
      config,
      "stream",
    );
    const streams = await Promise.all(
      filteredProviders.map(async (provider) => {
        return await provider.getStreams(content, config);
      }),
    );
    const streamResults = { streams: streams.flat() };
    cache.set(streamKey, streamResults);
    return streamResults;
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
    const streamKey = `subtitles:${args.type}:${args.id}`;
    const cacheStreams = cache.get(streamKey);
    if (cacheStreams) return cacheStreams;
    const content = await getContent(args);
    if (content == null) {
      return { subtitles: [] };
    }
    const { type, season, episode } = content;
    const filteredProviders = filterProvider(
      providers,
      args.id,
      config,
      "subtitles",
    );
    const results = await Promise.allSettled(
      filteredProviders.map(async (provider) => {
        const subtitleKey = `subtitles:${provider.name.toLowerCase()}:${type}:${content.id}:${season}:${episode}`;
        const cacheSubtitles: Subtitle[] = cache.get(subtitleKey);
        if (cacheSubtitles) return cacheSubtitles;
        const providerSubtitles = await provider.getSubtitles(content);
        if (providerSubtitles) return providerSubtitles;
        return [];
      }),
    );
    const subtitles = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .flat();
    return { subtitles: subtitles.flat() };
  } catch (error) {
    logger.error(`Subtitles handler error: ${error}`);
    return { subtitles: [] };
  }
}

function filterProvider(
  providers: BaseProvider[],
  id: string,
  config: UserConfig,
  resource: ShortManifestResource,
) {
  let configResource: Provider[] = [];
  if (resource === "catalog" || resource === "meta") {
    configResource = config.catalog;
  } else if (resource === "stream" || resource === "subtitles") {
    configResource = config.stream;
  }
  return providers.filter((provider) => {
    return (
      configResource.includes(provider.name) &&
      provider.supportedPrefix.some((prefix) => {
        return id.startsWith(prefix);
      })
    );
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
