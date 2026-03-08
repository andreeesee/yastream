import {
  AddonBuilder,
  AddonCatalogHandlerArgs,
  Cache,
  CatalogHandlerArgs,
  MetaDetail,
  MetaHandlerArgs,
  MetaPreview,
  ShortManifestResource,
  StreamHandlerArgs,
  Subtitle,
  SubtitlesHandlerArgs,
} from "@stremio-addon/sdk";
import KissKHScraper from "../source/kisskh.js";
// import TMDBService from "../source/tmdb.js";

import { IDramaScraper } from "../source/idrama.js";
import { KkphimScraper } from "../source/kkphim.js";
import { ContentDetail } from "../source/meta.js";
import { OnetouchtvScrapper } from "../source/onetouchtv.js";
import { OphimScraper } from "../source/ophim.js";
import { BaseProvider, Provider } from "../source/provider.js";
import { tmdb } from "../source/tmdb.js";
import { tvdb } from "../source/tvdb.js";
import { cache } from "../utils/cache.js";
import { extractTitleYear } from "../utils/fuse.js";
import { Logger } from "../utils/logger.js";
import {
  buildManifest,
  defaultConfig,
  Prefix,
  UserConfig,
} from "./manifest.js";
const kisskh = new KissKHScraper(Provider.KISSKH);
const idrama = new IDramaScraper(Provider.IDRAMA);
const kkphim = new KkphimScraper(Provider.KKPHIM);
const ophim = new OphimScraper(Provider.OPHIM);
const onetouchtv = new OnetouchtvScrapper(Provider.ONETOUCHTV);
const providers: BaseProvider[] = [kisskh, onetouchtv, idrama, kkphim, ophim];
const providersMap = new Map<Provider, BaseProvider>();
providers.forEach((provider) => {
  providersMap.set(provider.name, provider);
});
const logger = new Logger("ADDON");

async function getContent(
  args: SubtitlesHandlerArgs | CatalogHandlerArgs,
): Promise<ContentDetail | null> {
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
        logger.error(`No TMDB found with IMDB ${imdbId}`);
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
      const contentKey = `content:tvdb:${idramaId}`;
      const cacheContent = cache.get(contentKey);
      let content: ContentDetail | null = cacheContent;
      if (content) {
        return content;
      }
      const detail = await idrama.getStreamDetail(idramaId);
      if (!detail) return null;
      const { title, year } = detail;
      content = {
        id: idramaId,
        idramaId: idramaId,
        title: title,
        year: year,
        type: args.type,
        season: season ? parseInt(season) : 1,
        episode: episode ? parseInt(episode) : 1,
      };
      cache.set(contentKey, content, 24 * 60 * 60 * 1000);
      return content;
    }
    case args.id.startsWith(Prefix.KISSKH): {
      // id | kisskh:episodeId:season:episode
      const [prefix, kisskhId, season, episode] = args.id.split(":");
      if (!kisskhId) return null;
      const { title, releaseDate } = await kisskh.getDetail(kisskhId);
      const extracted = extractTitleYear(title);
      const pureTitle = extracted.title;
      const year = extracted.year || new Date(releaseDate).getFullYear();
      const content: ContentDetail = {
        id: kisskhId,
        kisskhId: kisskhId,
        title: pureTitle,
        year: year,
        type: args.type,
        season: season ? parseInt(season) : 1,
        episode: episode ? parseInt(episode) : 1,
      };
      return content;
    }
    case args.id.startsWith(Prefix.ONETOUCHTV): {
      // id | onetouchtv:detailId:season:episode
      const [prefix, onetouchtvId, season, episode] = args.id.split(":");
      if (!onetouchtvId) return null;
      const { title, year } = (await onetouchtv.getDetail(onetouchtvId)).result;
      const extracted = extractTitleYear(title);
      const pureTitle = extracted.title;
      const yearFormat = extracted.year || parseInt(year);
      const content: ContentDetail = {
        id: onetouchtvId,
        title: pureTitle,
        year: yearFormat,
        type: args.type,
        season: season ? parseInt(season) : 1,
        episode: episode ? parseInt(episode) : 1,
      };
      return content;
    }
  }
  return null;
}

export async function buildCatalogHandler(
  args: AddonCatalogHandlerArgs,
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
    const [prefix] = args.id.split(".");
    if (!prefix) {
      return { metas: [] };
    }
    const isSearch = args.extra.search;
    const providerName = prefix as Provider;
    const provider = providersMap.get(providerName);
    if (!provider) {
      logger.error(`No provider found for prefix ${prefix}`);
      return { metas: [] };
    }
    if (!filteredProviders.includes(provider)) {
      logger.error(`Provider ${providerName} is not selected`);
      return { metas: [] };
    }
    const metas = isSearch
      ? await provider.searchCatalog(args, config)
      : await provider.getCatalog(args, config);
    const metaPreviews = { metas: metas, cacheMaxAge: 4 * 60 * 60 };
    cache.set(catalogKey, metaPreviews, 4 * 60 * 60 * 1000);
    return metaPreviews;
  } catch (error) {
    logger.error(`Catalog handler error: ${error}`);
    return { metas: [] };
  }
}

export async function buildMetaHandler(
  args: MetaHandlerArgs,
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
      name: "You should use AIOMetadata for this metadata. Fix by order AIOMetadata to be higher than yastream",
    },
  };
  try {
    const content = await getContent(args);
    if (!content) return defaultMeta;

    const [prefix] = args.id.split(":");
    if (!prefix) {
      return defaultMeta;
    }
    const filteredProviders = filterProvider(
      providers,
      args.id,
      config,
      "meta",
    );
    const provider = providersMap.get(prefix as Provider);
    if (!provider) {
      logger.error(`No meta provider found for prefix ${prefix}`);
      return defaultMeta;
    }
    if (!filteredProviders.includes(provider)) {
      logger.error(`Meta provider ${prefix} is not selected`);
      return defaultMeta;
    }
    let meta = defaultMeta;
    const detail = await provider.getMeta(content, args.type);
    if (detail) {
      meta = { meta: detail };
    }
    cache.set(metaKey, meta, 4 * 60 * 60 * 1000);
    return meta;
  } catch (error) {
    logger.error(`Meta handler error: ${error}`);
    return defaultMeta;
  }
}

export async function buildStreamHandler(
  args: StreamHandlerArgs,
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
  args: SubtitlesHandlerArgs,
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
const builder = new AddonBuilder(buildManifest());
builder.defineCatalogHandler(async (args) => {
  return await buildCatalogHandler(args);
});
builder.defineMetaHandler(async (args) => {
  return await buildMetaHandler(args);
});
builder.defineStreamHandler(async (args) => {
  return await buildStreamHandler(args);
});
builder.defineSubtitlesHandler(async (args) => {
  return await buildSubtitleHandler(args);
});

export default builder.getInterface();
